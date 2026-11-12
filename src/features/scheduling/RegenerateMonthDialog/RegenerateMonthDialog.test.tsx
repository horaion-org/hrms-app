import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import {
	envelope,
	problemReply,
	stubApi,
	type StubReply,
} from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import { storyCompany } from "@/features/people/storyCompany";
import { constraintFixture } from "@/features/scheduling/constraints/fixtures";
import type { MonthWeek } from "@/features/scheduling/months/api";
import {
	monthGenerationFixture,
	monthWeekFixture,
	scheduleMonthFixture,
} from "@/features/scheduling/months/fixtures";
import { RegenerateMonthDialog } from "@/features/scheduling/RegenerateMonthDialog";
import { departmentShiftFixture } from "@/features/scheduling/shifts/fixtures";

const KITCHEN = "/api/v1/companies/c-1/branches/b-1/departments/d-1";
const GENERATION = "/api/v1/companies/c-1/schedule-months/2026-11/generation";
const NOVEMBER_WEEKS = [
	["2026-11-02", "2026-11-08"],
	["2026-11-09", "2026-11-15"],
	["2026-11-16", "2026-11-22"],
	["2026-11-23", "2026-11-29"],
	["2026-11-30", "2026-12-06"],
] as const;
const SHIFT = departmentShiftFixture();
const STAFFING = constraintFixture({
	constraintId: "co-1",
	name: "Morning cover",
	type: "SHIFT_STAFFING",
	values: [{ field: "SHIFT", value: SHIFT.shiftId, name: SHIFT.name }],
	requiresPeople: true,
});

/** November with every week tentative and covered, but for what `changes` sets by Monday. */
const november = (
	changes: Record<string, Partial<MonthWeek>> = {}
): ReturnType<typeof scheduleMonthFixture> =>
	scheduleMonthFixture({
		weeks: NOVEMBER_WEEKS.map(([periodStart, periodEnd], index) =>
			monthWeekFixture({
				periodStart,
				periodEnd,
				state: "TENTATIVE",
				scheduleId: `s-${index + 1}`,
				includedInMonthGeneration: true,
				...changes[periodStart],
			})
		),
	});

const ok = (data: unknown): StubReply => ({
	status: 200,
	body: envelope(data),
});

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const show = (
	month: ReturnType<typeof november>,
	onStarted = vi.fn()
): { dialog: () => Promise<HTMLElement> } => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider client={client}>
				{storyCompany(client, "c-1")(
					() => (
						<RegenerateMonthDialog
							companyId="c-1"
							month={month}
							onClose={vi.fn()}
							onStarted={onStarted}
						/>
					),
					{
						parameters: {
							permissions: [
								"schedule:generate",
								"schedule:create",
								"shift:read",
								"constraint:read",
							],
						},
					} as never
				)}
			</QueryClientProvider>
		</I18nextProvider>
	);
	return {
		dialog: () => screen.findByRole("dialog", { name: "Regenerate November?" }),
	};
};

describe("RegenerateMonthDialog", () => {
	it("given_nothingPublishedOrChanged_when_shown_then_everyWeekIsWorkedOutAgainWithoutRed", async () => {
		stubApi({});
		const dialog = await show(november()).dialog();

		expect(dialog).toHaveTextContent(
			"All 5 weeks of November are worked out again. Nothing is published yet, so every week can change."
		);
		expect(
			within(dialog).getByRole("button", { name: "Regenerate November" })
		).not.toHaveClass("bg-error-600");
	});

	it("given_aPublishedWeekAndOneChangedByHand_when_shown_then_namesBothAndAsksInRed", async () => {
		stubApi({});
		const dialog = await show(
			november({
				"2026-11-02": { state: "PUBLISHED", includedInMonthGeneration: false },
				"2026-11-16": { handChangedDays: 1 },
			})
		).dialog();

		expect(dialog).toHaveTextContent(
			/The 4 weeks of November that aren’t published are worked out again, from Nov 9\s?–\s?15 on\. The published weeks stay as they are\./
		);
		expect(dialog).toHaveTextContent(
			/Nov 16\s?–\s?22 was changed by hand\. Those changes will be replaced\./
		);
		expect(
			within(dialog).getByRole("button", { name: "Regenerate November" })
		).toHaveClass("bg-error-600");
	});

	it("given_twoWeeksChangedByHand_when_shown_then_namesThemTogether", async () => {
		stubApi({});
		const dialog = await show(
			november({
				"2026-11-16": { handChangedDays: 1 },
				"2026-11-23": { handChangedDays: 2 },
			})
		).dialog();

		expect(dialog).toHaveTextContent(
			/Nov 16\s?–\s?22 and Nov 23\s?–\s?29 were changed by hand\./
		);
	});

	it("given_aWeekToCreate_when_confirmed_then_postsTheMonthWithEverythingForIt", async () => {
		const user = userEvent.setup();
		const calls = stubApi({
			[`GET ${KITCHEN}/shifts`]: ok([SHIFT]),
			[`GET ${KITCHEN}/constraints`]: ok([STAFFING]),
			[`POST ${GENERATION}`]: ok(monthGenerationFixture({ month: "2026-11" })),
		});
		const onStarted = vi.fn();
		const dialog = await show(
			november({
				"2026-11-30": { state: "NOT_GENERATED", scheduleId: null },
			}),
			onStarted
		).dialog();
		const confirm = within(dialog).getByRole("button", {
			name: "Regenerate November",
		});
		await waitFor(() => {
			expect(confirm).toBeEnabled();
		});

		await user.click(confirm);

		await waitFor(() => {
			expect(onStarted).toHaveBeenCalledOnce();
		});
		const post = calls.find((call) => call.method === "POST");
		expect(post?.search).toBe("departmentId=d-1");
		expect(post?.body).toEqual({
			includeLeave: true,
			allowOpenShifts: false,
			newWeeks: [
				{
					periodStart: "2026-11-30",
					includedShiftIds: [SHIFT.shiftId],
					includedConstraintIds: ["co-1"],
				},
			],
		});
	});

	it("given_aRefusal_when_confirmed_then_showsItInside", async () => {
		const user = userEvent.setup();
		stubApi({ [`POST ${GENERATION}`]: problemReply(403, "FORBIDDEN") });
		const dialog = await show(november()).dialog();

		await user.click(
			within(dialog).getByRole("button", { name: "Regenerate November" })
		);

		expect(await within(dialog).findByRole("alert")).toHaveTextContent(
			"You don’t have permission to generate this month here."
		);
	});
});
