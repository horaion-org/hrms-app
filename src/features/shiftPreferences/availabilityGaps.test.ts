import { describe, expect, it } from "vitest";
import type { PreferenceDay } from "@/features/shiftPreferences/api";
import { daysWithoutAvailability } from "@/features/shiftPreferences/availabilityGaps";

/** An open day with no shifts, or a closed one when `editable` is false. */
const day = (date: string, editable = true): PreferenceDay => ({
	date,
	editable,
	shifts: [],
});

// 2026-11-23 is a Monday.
const WEEK = [
	day("2026-11-23", false),
	day("2026-11-24"),
	day("2026-11-25"),
	day("2026-11-26"),
];

describe("daysWithoutAvailability", () => {
	it("given_weekdaysWithAvailability_when_asked_then_listsTheOpenDaysOnOtherWeekdays", () => {
		expect(daysWithoutAvailability(WEEK, ["TUE", "THU"])).toEqual([
			"2026-11-25",
		]);
	});

	it("given_noAvailabilityAtAll_when_asked_then_listsEveryOpenDayButNotAClosedOne", () => {
		expect(daysWithoutAvailability(WEEK, [])).toEqual([
			"2026-11-24",
			"2026-11-25",
			"2026-11-26",
		]);
	});

	it("given_availabilityOnEveryOpenDay_when_asked_then_listsNothing", () => {
		expect(daysWithoutAvailability(WEEK, ["TUE", "WED", "THU"])).toEqual([]);
	});
});
