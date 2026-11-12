import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchScheduleMonth,
	fetchScheduleMonthSummaries,
	scheduleMonthQuery,
	scheduleMonthSummariesQuery,
} from "@/features/scheduling/months/api";
import {
	monthSummaryFixture,
	monthWeekFixture,
	scheduleMonthFixture,
} from "@/features/scheduling/months/fixtures";

const MONTHS = "/api/v1/companies/c-1/schedule-months";
const NOVEMBER = `${MONTHS}/2026-11`;
const RANGE = { from: "2026-11", to: "2027-11" };

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

describe("schedule months client", () => {
	it("given_aDepartmentsMonth_when_fetched_then_asksByQueryAndParsesEveryWeek", async () => {
		const calls = stubApi({
			[`GET ${NOVEMBER}`]: {
				status: 200,
				body: envelope(scheduleMonthFixture()),
			},
		});

		await expect(fetchScheduleMonth("c-1", "d-1", "2026-11")).resolves.toEqual(
			scheduleMonthFixture()
		);
		expect(calls[0]?.search).toBe("departmentId=d-1");
	});

	it("given_aStateANewerApiAdds_when_parsed_then_readsAsUnknown", async () => {
		stubApi({
			[`GET ${NOVEMBER}`]: {
				status: 200,
				body: envelope(
					scheduleMonthFixture({
						weeks: [{ ...monthWeekFixture(), state: "UPDATING" as never }],
					})
				),
			},
		});

		const month = await fetchScheduleMonth("c-1", "d-1", "2026-11");

		expect(month.weeks[0]?.state).toBe("UNKNOWN");
	});

	it("given_unitFilters_when_summariesFetched_then_namesOnlyTheSetOnesBesideTheRange", async () => {
		const calls = stubApi({
			[`GET ${MONTHS}`]: {
				status: 200,
				body: envelope([monthSummaryFixture()]),
			},
		});

		await expect(
			fetchScheduleMonthSummaries("c-1", {}, RANGE)
		).resolves.toEqual([monthSummaryFixture()]);
		await fetchScheduleMonthSummaries("c-1", { branchId: "b-1" }, RANGE);
		await fetchScheduleMonthSummaries(
			"c-1",
			{ branchId: "b-1", departmentId: "d-1" },
			RANGE
		);
		expect(calls.map((call) => call.search)).toEqual([
			"from=2026-11&to=2027-11",
			"from=2026-11&to=2027-11&branchId=b-1",
			"from=2026-11&to=2027-11&branchId=b-1&departmentId=d-1",
		]);
	});

	it("given_noPermission_when_queried_then_asksForNothing", () => {
		expect(typeof scheduleMonthQuery("c-1", "d-1", "2026-11").queryFn).toBe(
			"function"
		);
		expect(
			typeof scheduleMonthQuery("c-1", "d-1", "2026-11", false).queryFn
		).not.toBe("function");
		expect(
			typeof scheduleMonthSummariesQuery("c-1", {}, RANGE, false).queryFn
		).not.toBe("function");
	});

	it("given_bothReads_when_keyed_then_bothSitUnderTheCompanysMonths", () => {
		expect(scheduleMonthQuery("c-1", "d-1", "2026-11").queryKey).toEqual([
			"scheduling",
			"c-1",
			"months",
			"d-1",
			"2026-11",
		]);
		expect(
			scheduleMonthSummariesQuery("c-1", {}, RANGE).queryKey.slice(0, 3)
		).toEqual(["scheduling", "c-1", "months"]);
	});
});
