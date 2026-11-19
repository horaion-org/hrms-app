import { describe, expect, it } from "vitest";
import {
	datesRunNoticeOf,
	datesRunOf,
	withDatesRun,
} from "@/features/scheduling/months/datesRunState";
import { refusedWeeksFrom } from "@/features/scheduling/months/refusedWeeksState";

/** The history state a run by dates from `firstDay` to `lastDay` leaves. */
const stateOf = (firstDay: string, lastDay: string): unknown =>
	withDatesRun(
		{ "2027-11-29": "SCHEDULE_HAS_NO_EMPLOYEES" },
		{ firstDay, lastDay }
	)({});

describe("datesRunNoticeOf", () => {
	it.each([
		[
			"aRunInOneMonth",
			stateOf("2027-11-10", "2027-11-12"),
			"2027-11",
			{ days: { from: "2027-11-10", to: "2027-11-12" } },
		],
		[
			"aRunPastTheMonthEnd",
			stateOf("2027-11-29", "2027-12-03"),
			"2027-11",
			{
				days: { from: "2027-11-29", to: "2027-12-03" },
				otherMonth: {
					month: "2027-12",
					days: { from: "2027-12-01", to: "2027-12-03" },
				},
			},
		],
		[
			"anotherMonthsPage",
			stateOf("2027-11-29", "2027-12-03"),
			"2027-12",
			undefined,
		],
		["noRunByDates", { refusedWeeks: {} }, "2027-11", undefined],
		["noState", undefined, "2027-11", undefined],
	])("given_%s_when_read_then_itsNotice", (_case, state, month, notice) => {
		expect(datesRunNoticeOf(state, month)).toEqual(notice);
	});

	it("given_aRunByDates_when_carried_then_itsRefusedWeeksStillRead", () => {
		expect(refusedWeeksFrom(stateOf("2027-11-29", "2027-12-03"))).toEqual({
			"2027-11-29": "SCHEDULE_HAS_NO_EMPLOYEES",
		});
	});
});

describe("datesRunOf", () => {
	it.each([
		[
			"aRun",
			stateOf("2027-11-29", "2027-12-03"),
			{ from: "2027-11-29", to: "2027-12-03" },
		],
		["noRun", { refusedWeeks: {} }, undefined],
		["noState", undefined, undefined],
	])("given_%s_then_itsDays", (_, state, expected) => {
		expect(datesRunOf(state)).toEqual(expected);
	});
});
