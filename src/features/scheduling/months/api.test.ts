import { QueryClient, QueryObserver } from "@tanstack/react-query";
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
	scheduleMonthsKey,
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
		// Gated by `enabled`, so an observer that may not read never takes the query function from one that may.
		expect(scheduleMonthQuery("c-1", "d-1", "2026-11", false).enabled).toBe(
			false
		);
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
		weeks: ["2026-11-30"],
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
		expect(calls[0]?.body).toMatchObject({ weeks: ["2026-11-30"] });
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

	it("given_aWeekTakenOutOfTheQueueAndOneWithoutTheField_when_parsed_then_theRefusalReadsAndTheOtherIsNull", async () => {
		// Undefined is left out of the JSON reply, as an API without the field sends it.
		const withoutTheField = {
			...monthWeekFixture(),
			queueRefusal: undefined as never,
		};
		const stopped = monthWeekFixture({
			periodStart: "2026-11-09",
			periodEnd: "2026-11-15",
			state: "DRAFT",
			queueRefusal: { code: "EARLIER_WEEK_FAILED", at: "2026-11-17T09:20:00Z" },
		});
		stubApi({
			[`GET ${NOVEMBER}`]: {
				status: 200,
				body: envelope(
					scheduleMonthFixture({ weeks: [withoutTheField, stopped] })
				),
			},
		});

		const month = await fetchScheduleMonth("c-1", "d-1", "2026-11");

		expect(month.weeks[0]?.queueRefusal).toBeNull();
		expect(month.weeks[1]?.queueRefusal).toEqual({
			code: "EARLIER_WEEK_FAILED",
			at: "2026-11-17T09:20:00Z",
		});
	});

	it("given_aWeekInTwoParts_when_parsed_then_itsPartsAndUncoveredDaysRead", async () => {
		const days = monthWeekFixture().days.map((day, index) => ({
			...day,
			covered: index >= 3,
		}));
		// Undefined fields are left out of the JSON reply, as an older API sends them.
		const olderDay = { ...days[0]!, covered: undefined as never };
		const parts = [
			{
				scheduleId: "s-1",
				name: "Week of 2026-11-02",
				named: false,
				coveredFrom: "2026-11-02",
				coveredTo: "2026-11-04",
				state: "PUBLISHED",
			},
			{
				scheduleId: "s-2",
				name: "Year-end gala",
				named: true,
				coveredFrom: "2026-11-05",
				coveredTo: "2026-11-08",
				state: "TO_REVIEW",
			},
		];
		const olderWeek = {
			...monthWeekFixture({
				periodStart: "2026-11-09",
				periodEnd: "2026-11-15",
			}),
			parts: undefined as never,
		};
		stubApi({
			[`GET ${NOVEMBER}`]: {
				status: 200,
				body: envelope(
					scheduleMonthFixture({
						weeks: [
							monthWeekFixture({
								state: "TO_REVIEW",
								scheduleId: "s-2",
								coveredFrom: "2026-11-05",
								coveredTo: "2026-11-08",
								name: "Year-end gala",
								days,
								parts: parts as never,
							}),
							{ ...olderWeek, days: [olderDay] },
						],
					})
				),
			},
		});

		const month = await fetchScheduleMonth("c-1", "d-1", "2026-11");

		expect(month.weeks[0]?.parts.map((part) => part.named)).toEqual([
			false,
			true,
		]);
		expect(month.weeks[0]?.coveredFrom).toBe("2026-11-05");
		expect(month.weeks[0]?.days.map((day) => day.covered)).toEqual([
			false,
			false,
			false,
			true,
			true,
			true,
			true,
		]);
		expect(month.weeks[1]?.parts).toEqual([]);
		expect(month.weeks[1]?.days[0]?.covered).toBe(true);
	});

	it("given_theCheckQuery_when_built_then_itsKeySitsUnderTheMonthReads", () => {
		expect(
			monthGenerationCheckQuery("c-1", "d-1", "2026-11").queryKey.slice(0, 3)
		).toEqual(["scheduling", "c-1", "months"]);
	});

	it("given_aReaderAndAnObserverThatAsksNothingOnOneMonth_when_invalidated_then_theMonthIsReadAgain", async () => {
		const calls = stubApi({
			[`GET ${NOVEMBER}`]: {
				status: 200,
				body: envelope(scheduleMonthFixture()),
			},
		});
		const client = new QueryClient();
		const reader = new QueryObserver(
			client,
			scheduleMonthQuery("c-1", "d-1", "2026-11", true)
		);
		const stopReader = reader.subscribe(() => {});
		await vi.waitFor(() => {
			expect(reader.getCurrentResult().isSuccess).toBe(true);
		});
		// One that may not read the month yet observes the same key, and is set last.
		const stopIdle = new QueryObserver(
			client,
			scheduleMonthQuery("c-1", "d-1", "2026-11", false)
		).subscribe(() => {});

		await client.invalidateQueries({ queryKey: scheduleMonthsKey("c-1") });

		expect(calls).toHaveLength(2);
		expect(reader.getCurrentResult().isError).toBe(false);
		stopIdle();
		stopReader();
		client.clear();
	});
});
