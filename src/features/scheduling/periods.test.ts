import { describe, expect, it } from "vitest";
import {
	formatPeriod,
	periodStartingOn,
	upcomingPeriods,
} from "@/features/scheduling/periods";

describe("upcomingPeriods", () => {
	it("given_aTuesday_when_listed_then_startsFromTheNextMonday", () => {
		expect(upcomingPeriods(new Date(2026, 9, 6))).toEqual([
			{ start: "2026-10-12", end: "2026-10-18" },
			{ start: "2026-10-19", end: "2026-10-25" },
			{ start: "2026-10-26", end: "2026-11-01" },
		]);
	});

	it("given_aMonday_when_listed_then_startsThatDay", () => {
		expect(upcomingPeriods(new Date(2026, 3, 13), 1)).toEqual([
			{ start: "2026-04-13", end: "2026-04-19" },
		]);
	});

	it("given_aSunday_when_listed_then_startsTheNextDay", () => {
		expect(upcomingPeriods(new Date(2026, 3, 12), 1)[0]?.start).toBe(
			"2026-04-13"
		);
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
