import { describe, expect, it } from "vitest";
import {
	defaultPeriod,
	FUTURE_WEEKS,
	formatPeriod,
	PAST_WEEKS,
	periodStartingOn,
	selectablePeriods,
	withPeriod,
} from "@/features/scheduling/periods";

// Monday 2 Nov 2026, Wednesday 4 Nov and Sunday 8 Nov: one week, three days into it.
const MONDAY = new Date(2026, 10, 2);
const WEDNESDAY = new Date(2026, 10, 4);
const SUNDAY = new Date(2026, 10, 8);

describe("selectablePeriods", () => {
	it("given_aWednesday_when_listed_then_twoWeeksBackThisWeekAndTenAhead", () => {
		const periods = selectablePeriods(WEDNESDAY);

		expect(periods).toHaveLength(PAST_WEEKS + 1 + FUTURE_WEEKS);
		expect(periods[0]).toEqual({
			start: "2026-10-19",
			end: "2026-10-25",
			started: true,
		});
		expect(periods[periods.length - 1]).toEqual({
			start: "2027-01-11",
			end: "2027-01-17",
		});
	});

	it("given_aWednesday_when_listed_then_namesLastThisAndNextWeek", () => {
		expect(selectablePeriods(WEDNESDAY).slice(1, 4)).toEqual([
			{
				start: "2026-10-26",
				end: "2026-11-01",
				relative: "last",
				started: true,
			},
			{
				start: "2026-11-02",
				end: "2026-11-08",
				relative: "this",
				started: true,
			},
			{ start: "2026-11-09", end: "2026-11-15", relative: "next" },
		]);
	});

	it("given_aMonday_when_listed_then_thisWeekHasNotStarted", () => {
		expect(selectablePeriods(MONDAY)[PAST_WEEKS]).toEqual({
			start: "2026-11-02",
			end: "2026-11-08",
			relative: "this",
		});
	});

	it("given_aSunday_when_listed_then_thisWeekIsTheOneEndingToday", () => {
		expect(selectablePeriods(SUNDAY)[PAST_WEEKS]).toMatchObject({
			start: "2026-11-02",
			relative: "this",
			started: true,
		});
	});

	it("given_otherCounts_when_listed_then_offersThoseWeeks", () => {
		expect(
			selectablePeriods(WEDNESDAY, { weeksBack: 0, weeksAhead: 1 }).map(
				(period) => period.start
			)
		).toEqual(["2026-11-02", "2026-11-09"]);
	});
});

describe("defaultPeriod", () => {
	it("given_aTuesday_when_chosen_then_theNextMondaysWeek", () => {
		expect(defaultPeriod(new Date(2026, 9, 6))).toEqual({
			start: "2026-10-12",
			end: "2026-10-18",
			relative: "next",
		});
	});

	it("given_aMonday_when_chosen_then_thisWeek", () => {
		expect(defaultPeriod(MONDAY)).toEqual({
			start: "2026-11-02",
			end: "2026-11-08",
			relative: "this",
		});
	});

	it("given_aSunday_when_chosen_then_theNextDaysWeek", () => {
		expect(defaultPeriod(SUNDAY).start).toBe("2026-11-09");
	});
});

describe("withPeriod", () => {
	const offered = selectablePeriods(WEDNESDAY, { weeksBack: 0, weeksAhead: 1 });

	it("given_aWeekAlreadyOffered_when_added_then_theSameList", () => {
		expect(withPeriod(offered, "2026-11-09", WEDNESDAY)).toBe(offered);
	});

	it("given_anOlderWeek_when_added_then_placedFirstAndMarkedStarted", () => {
		expect(withPeriod(offered, "2026-09-07", WEDNESDAY)[0]).toEqual({
			start: "2026-09-07",
			end: "2026-09-13",
			started: true,
		});
	});

	it("given_aLaterWeek_when_added_then_placedLast", () => {
		expect(
			withPeriod(offered, "2027-03-01", WEDNESDAY).map((period) => period.start)
		).toEqual(["2026-11-02", "2026-11-09", "2027-03-01"]);
	});
});

describe("periodStartingOn", () => {
	it("given_aMonday_when_built_then_endsOnTheSunday", () => {
		expect(periodStartingOn("2026-03-30")).toEqual({
			start: "2026-03-30",
			end: "2026-04-05",
		});
	});
});

// ICU spaces the range dash with narrow no-break spaces that vary by version.
const spaced = (text: string): string => text.replace(/\s+/gu, " ");

describe("formatPeriod", () => {
	it("given_aWeekInOneMonth_when_formatted_then_sharesTheMonthAndYear", () => {
		expect(spaced(formatPeriod(periodStartingOn("2026-04-13"), "en-GB"))).toBe(
			"13 – 19 Apr 2026"
		);
	});

	it("given_aWeekAcrossMonths_when_formatted_then_namesBothMonths", () => {
		expect(spaced(formatPeriod(periodStartingOn("2026-04-27"), "en-GB"))).toBe(
			"27 Apr – 3 May 2026"
		);
	});
});
