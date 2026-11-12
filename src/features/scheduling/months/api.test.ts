import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClient, resetApiClient } from "@/common/api-client";
import { envelope, stubApi } from "@/common/testing/stubApi";
import {
	fetchMonthGenerationCheck,
	fetchScheduleMonth,
	fetchScheduleMonthSummaries,
	generateMonth,
	monthGenerationCheckQuery,
	scheduleMonthQuery,
	scheduleMonthSummariesQuery,
} from "@/features/scheduling/months/api";
import {
	monthGenerationCheckFixture,
	monthGenerationFixture,
	monthSummaryFixture,
	monthWeekFixture,
	scheduleMonthFixture,
	ungeneratedMonthFixture,
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

describe("generating a month", () => {
	const CHECK = `${NOVEMBER}/generation-check`;
	const GENERATION = `${NOVEMBER}/generation`;
	const BODY = {
		includeLeave: true,
		allowOpenShifts: false,
		newWeeks: [
			{
				periodStart: "2026-11-30",
				includedShiftIds: ["sh-1"],
				includedConstraintIds: ["co-1"],
			},
		],
	};

	it("given_theCheck_when_fetched_then_asksTheMonthsCheckWithTheDepartmentInTheQueryOnly", async () => {
		const calls = stubApi({
			[`GET ${CHECK}`]: {
				status: 200,
				body: envelope(monthGenerationCheckFixture()),
			},
		});

		await expect(
			fetchMonthGenerationCheck("c-1", "d-1", "2026-11")
		).resolves.toEqual(monthGenerationCheckFixture());
		expect(calls[0]?.path).toBe(CHECK);
		expect(calls[0]?.search).toBe("departmentId=d-1");
	});

	it("given_aGeneration_when_posted_then_sendsTheBodyToTheMonthWithTheDepartmentInTheQueryOnly", async () => {
		const calls = stubApi({
			[`POST ${GENERATION}`]: {
				status: 200,
				body: envelope(monthGenerationFixture()),
			},
		});

		await expect(generateMonth("c-1", "d-1", "2026-11", BODY)).resolves.toEqual(
			monthGenerationFixture()
		);
		expect(calls[0]?.path).toBe(GENERATION);
		expect(calls[0]?.search).toBe("departmentId=d-1");
		expect(calls[0]?.body).toEqual(BODY);
	});

	it("given_anOutcomeANewerApiAdds_when_parsed_then_readsAsUnknown", async () => {
		const answer = monthGenerationFixture();
		stubApi({
			[`POST ${GENERATION}`]: {
				status: 200,
				body: envelope({
					...answer,
					weeks: [{ ...answer.weeks[0], outcome: "QUEUED" }],
				}),
			},
		});

		const parsed = await generateMonth("c-1", "d-1", "2026-11", BODY);

		expect(parsed.weeks[0]?.outcome).toBe("UNKNOWN");
	});

	it("given_weeksWithAndWithoutTheGenerationFields_when_parsed_then_bothRead", async () => {
		const failed = monthWeekFixture({
			state: "FAILED",
			includedInMonthGeneration: true,
			failure: {
				runStatus: "FAILED",
				errorCode: "engine_unreachable",
				engineOutcome: null,
			},
		});
		stubApi({
			[`GET ${NOVEMBER}`]: {
				status: 200,
				body: envelope(
					scheduleMonthFixture({ weeks: [failed, monthWeekFixture()] })
				),
			},
		});

		const month = await fetchScheduleMonth("c-1", "d-1", "2026-11");

		expect(month.weeks[0]?.failure?.errorCode).toBe("engine_unreachable");
		expect(month.weeks[0]?.includedInMonthGeneration).toBe(true);
		expect(month.weeks[1]?.includedInMonthGeneration).toBeUndefined();
		expect(ungeneratedMonthFixture().weeks).toHaveLength(4);
	});

	it("given_theCheckQuery_when_built_then_itsKeySitsUnderTheMonthReads", () => {
		expect(
			monthGenerationCheckQuery("c-1", "d-1", "2026-11").queryKey.slice(0, 3)
		).toEqual(["scheduling", "c-1", "months"]);
	});
});
