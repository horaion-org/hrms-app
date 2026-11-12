import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi, type StubReply } from "@/common/testing/stubApi";
import type { FunctionComponent } from "@/common/types";
import { storyCompany } from "@/features/people/storyCompany";
import { constraintFixture } from "@/features/scheduling/constraints/fixtures";
import {
	monthGenerationFixture,
	ungeneratedMonthFixture,
} from "@/features/scheduling/months/fixtures";
import { useGenerateMonth } from "@/features/scheduling/months/useGenerateMonth";
import { departmentShiftFixture } from "@/features/scheduling/shifts/fixtures";

const KITCHEN = "/api/v1/companies/c-1/branches/b-1/departments/d-1";
const GENERATION = "/api/v1/companies/c-1/schedule-months/2026-12/generation";
const SHIFT = departmentShiftFixture();
const STAFFING = constraintFixture({
	constraintId: "co-1",
	name: "Morning cover",
	type: "SHIFT_STAFFING",
	values: [{ field: "SHIFT", value: SHIFT.shiftId, name: SHIFT.name }],
	requiresPeople: true,
});
const EVERY_KEY = [
	"schedule:generate",
	"schedule:create",
	"shift:read",
	"constraint:read",
];

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

const ok = (body: unknown): StubReply => ({
	status: 200,
	body: envelope(body),
});

const lists = (): Record<string, StubReply> => ({
	[`GET ${KITCHEN}/shifts`]: ok([SHIFT]),
	[`GET ${KITCHEN}/constraints`]: ok([STAFFING]),
	[`POST ${GENERATION}`]: ok(monthGenerationFixture()),
});

/** The hook for Kitchen's December, holding `permissions` company-wide. */
const generateFor = (
	permissions: Array<string>
): ReturnType<
	typeof renderHook<ReturnType<typeof useGenerateMonth>, unknown>
> => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const wrapper = ({
		children,
	}: {
		children: ReactNode;
	}): FunctionComponent => (
		<QueryClientProvider client={client}>
			{storyCompany(client, "c-1")(
				() => (
					<>{children}</>
				),
				{
					parameters: { permissions },
				} as never
			)}
		</QueryClientProvider>
	);
	return renderHook(() => useGenerateMonth("c-1", ungeneratedMonthFixture()), {
		wrapper,
	});
};

describe("useGenerateMonth", () => {
	it("given_theListsNotRead_when_read_then_blockedUntilEverythingIsKnown", async () => {
		stubApi({});
		const { result } = generateFor(EVERY_KEY);

		await waitFor(() => {
			expect(result.current?.block).toBe("listsLoading");
		});
	});

	it(
		"given_weeksToCreateAndNoChoice_when_generated_then_eachGetsEverything",
		{ timeout: 15_000 },
		async () => {
			const calls = stubApi(lists());
			const { result } = generateFor(EVERY_KEY);
			await waitFor(() => {
				expect(calls.filter((call) => call.method === "GET")).toHaveLength(2);
			});

			await act(async () => {
				await result.current.generate();
			});

			const post = calls.find((call) => call.method === "POST");
			expect(post?.search).toBe("departmentId=d-1");
			expect(post?.body).toEqual({
				includeLeave: true,
				allowOpenShifts: false,
				newWeeks: ["2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28"].map(
					(periodStart) => ({
						periodStart,
						includedShiftIds: [SHIFT.shiftId],
						includedConstraintIds: ["co-1"],
					})
				),
			});
			await waitFor(() => {
				expect(result.current.answer?.weeks).toHaveLength(4);
			});
		}
	);

	it(
		"given_aChoiceForOneWeek_when_generated_then_thatWeekSendsItAndTheOthersEverything",
		{ timeout: 15_000 },
		async () => {
			const calls = stubApi(lists());
			const { result } = generateFor(EVERY_KEY);
			await waitFor(() => {
				expect(calls.filter((call) => call.method === "GET")).toHaveLength(2);
			});

			await act(async () => {
				await result.current.generate({
					choices: {
						"2026-12-14": { shiftIds: [SHIFT.shiftId], constraintIds: [] },
					},
					setup: { includeLeave: false, allowOpenShifts: true },
				});
			});

			const body = calls.find((call) => call.method === "POST")?.body as {
				includeLeave: boolean;
				newWeeks: Array<{
					periodStart: string;
					includedConstraintIds: Array<string>;
				}>;
			};
			expect(body.includeLeave).toBe(false);
			expect(body.newWeeks.map((week) => week.includedConstraintIds)).toEqual([
				["co-1"],
				[],
				["co-1"],
				["co-1"],
			]);
		}
	);

	it("given_noShiftRead_when_read_then_blockedForListsHidden", async () => {
		stubApi(lists());
		const { result } = generateFor([
			"schedule:generate",
			"schedule:create",
			"constraint:read",
		]);

		await waitFor(() => {
			expect(result.current?.block).toBe("listsHidden");
		});
	});

	it("given_noScheduleCreate_when_read_then_blockedForCannotCreate", async () => {
		stubApi(lists());
		const { result } = generateFor([
			"schedule:generate",
			"shift:read",
			"constraint:read",
		]);

		await waitFor(() => {
			expect(result.current?.block).toBe("cannotCreate");
		});
	});
});
