import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	callInOption,
	NOT_ASSIGNED_FIXTURE,
	repairOptionsFixture,
	stretchAfterOption,
} from "@/features/scheduling/cover/engineRepairFixtures";
import { coverOptionsFixture } from "@/features/scheduling/cover/fixtures";
import {
	rosterChangeFixture,
	rosterChangePreviewFixture,
} from "@/features/scheduling/rosterChanges/fixtures";
import { scheduleAssignmentsFixture } from "@/features/scheduling/schedules/fixtures";
import { frozenShiftsFixture } from "@/features/scheduling/shifts/fixtures";
import { GapCover, type IssueCoverContext } from "./GapCover";

/*
 * A short shift's Issues row, open: Front Desk AM one short on Saturday 17
 * October, through the stubbed API. Aisha (off that day) and Chen (overtime)
 * are the backend's people; the engine's answer varies by test.
 */

const SCHEDULE =
	"/api/v1/companies/c-1/branches/b-1/departments/d-1/schedules/s-1";
const COVER_OPTIONS = `${SCHEDULE}/cover-options`;
const PREVIEW = `${SCHEDULE}/roster-changes/preview`;
const CHANGES = `${SCHEDULE}/roster-changes`;
const REPAIR_OPTIONS = `${SCHEDULE}/repair-options`;
const GAP = coverOptionsFixture().gap;
const UNREACHABLE =
	"The engine could not be reached. These people are free by their hours and are not checked against the rules.";
const answer = (body: unknown): { status: number; body: unknown } => ({
	status: 200,
	body: envelope(body),
});

beforeEach(() => {
	configureApiClient({
		accessToken: () => Promise.resolve("test-pass"),
		renew: () => Promise.resolve({ kind: "expired" }),
		onUnauthenticated: () => {},
	});
});
afterEach(() => {
	resetApiClient();
	vi.unstubAllGlobals();
});

/** The open row for the gap, on a draft unless `published`; gives its context. */
const show = (published = false): IssueCoverContext => {
	const cover: IssueCoverContext = {
		target: {
			companyId: "c-1",
			unit: { branchId: "b-1", departmentId: "d-1" },
			scheduleId: "s-1",
			runId: "r-1",
		},
		revision: 1,
		assignments: scheduleAssignmentsFixture(),
		shifts: frozenShiftsFixture(),
		coverOffers: published
			? { offers: [], timeZone: "Asia/Singapore" }
			: undefined,
		onPreviewDays: vi.fn(),
		onApplied: vi.fn(),
	};
	render(
		<I18nextProvider i18n={authTestI18n}>
			<QueryClientProvider
				client={
					new QueryClient({ defaultOptions: { queries: { retry: false } } })
				}
			>
				<GapCover cover={cover} gap={{ shiftId: GAP.shiftId, day: GAP.day }} />
			</QueryClientProvider>
		</I18nextProvider>
	);
	return cover;
};

describe("GapCover", () => {
	it("given_aDraftAndTheEngineAnswering_when_opened_then_oneLineWhileItWorksThenItsOptionsAsCardsOneSuggested", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture(
					[callInOption(), stretchAfterOption()],
					NOT_ASSIGNED_FIXTURE
				)
			),
		});
		show();

		expect(screen.getByText("Working out the options…")).toBeVisible();
		const cards = await screen.findAllByRole("listitem");
		expect(cards).toHaveLength(2);
		expect(cards[0]).toHaveTextContent(/Aisha Rahman.*Suggested.*Within hours/);
		expect(cards[1]).toHaveTextContent(/Ben Ong.*Stays on 2 h.*Lunch Rush .*\+2 h/);
		expect(screen.getAllByText("Suggested")).toHaveLength(1);
		const whyNot = screen.getByRole("button", { name: "Why not others (3)" });
		expect(whyNot).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Working out the options…")).toBeNull();
	});

	it("given_anEngineOption_when_reviewedAndApplied_then_itsChangeShowsInsideTheRowAndGoesIn", async () => {
		const calls = stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${CHANGES}`]: {
				status: 201,
				body: envelope(rosterChangeFixture()),
			},
			[`POST ${REPAIR_OPTIONS}`]: answer(
				repairOptionsFixture([callInOption()])
			),
		});
		const { onApplied } = show();
		const user = userEvent.setup();

		await user.click(
			await screen.findByRole("button", { name: "Review Aisha Rahman’s change" })
		);

		expect(
			screen.getByRole("heading", { name: "What changes for Aisha Rahman" })
		).toBeVisible();
		const apply = screen.getByRole("button", { name: "Apply change" });
		await waitFor(() => {
			expect(apply).toBeEnabled();
		});
		await user.click(apply);
		await waitFor(() => {
			expect(onApplied).toHaveBeenCalled();
		});
		expect(calls.find((call) => call.path === CHANGES)?.body).toMatchObject({
			cells: [{ membershipId: "m-1", day: GAP.day, kind: "WORK" }],
		});
	});

	it("given_theEngineUnreachable_when_opened_then_thePlainLineAndTheBackendsPeopleWithTheirWeekInTheReview", async () => {
		stubApi({
			[`POST ${COVER_OPTIONS}`]: answer(coverOptionsFixture()),
			[`POST ${PREVIEW}`]: answer(rosterChangePreviewFixture()),
			[`POST ${REPAIR_OPTIONS}`]: { status: 503 },
		});
		show();
		const user = userEvent.setup();

		expect(await screen.findByText(UNREACHABLE)).toBeVisible();
		const cards = await screen.findAllByRole("listitem");
		expect(cards[0]).toHaveTextContent(
			/Aisha Rahman.*Suggested.*Not rule-checked/
		);
		await user.click(within(cards[0]!).getByRole("button", { name: /^Review/ }));

		expect(screen.getByText("This week 24 → 30 h of 44 h")).toBeVisible();
		expect(screen.getByRole("progressbar")).toBeVisible();
		await user.click(screen.getByRole("button", { name: "Back" }));
		expect(screen.getAllByRole("button", { name: /^Review/ })).toHaveLength(2);
	});
});
