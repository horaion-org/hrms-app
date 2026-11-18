import { describe, expect, it } from "vitest";
import {
	coverDays,
	monthWeekFixture,
} from "@/features/scheduling/months/fixtures";
import {
	weekGapsOf,
	type WeekGap,
} from "@/features/scheduling/months/weekGaps";

const MONDAY = "2027-02-08";

/** The week of 8 Feb 2027 with the given day indexes (Monday 0) without a roster. */
const weekWithout = (
	uncovered: Array<number>
): Parameters<typeof weekGapsOf>[0] =>
	monthWeekFixture({
		periodStart: MONDAY,
		periodEnd: "2027-02-14",
		days: coverDays(MONDAY).map((day, index) => ({
			...day,
			covered: !uncovered.includes(index),
		})),
	});

describe("weekGapsOf", () => {
	it.each<[string, Parameters<typeof weekGapsOf>[0], string, Array<WeekGap>]>([
		["aFullWeekCovered", weekWithout([]), "2027-02-01", []],
		[
			"aMiddleGap",
			weekWithout([2, 3, 4]),
			"2027-02-01",
			[{ days: { from: "2027-02-10", to: "2027-02-12" }, passed: false }],
		],
		[
			"aGapAtTheStartThatHasPassed",
			weekWithout([0, 1]),
			"2027-02-10",
			[{ days: { from: "2027-02-08", to: "2027-02-09" }, passed: true }],
		],
		[
			"aGapAcrossToday",
			weekWithout([0, 1, 2]),
			"2027-02-09",
			[
				{ days: { from: "2027-02-08", to: "2027-02-08" }, passed: true },
				{ days: { from: "2027-02-09", to: "2027-02-10" }, passed: false },
			],
		],
		[
			"aGapAtTheEnd",
			weekWithout([5, 6]),
			"2027-02-01",
			[{ days: { from: "2027-02-13", to: "2027-02-14" }, passed: false }],
		],
		[
			"noScheduleAtAll",
			monthWeekFixture({
				periodStart: MONDAY,
				periodEnd: "2027-02-14",
				scheduleId: null,
				state: "NOT_GENERATED",
				days: [],
			}),
			"2027-02-01",
			[{ days: { from: "2027-02-08", to: "2027-02-14" }, passed: false }],
		],
		[
			"noScheduleAndStarted",
			monthWeekFixture({
				periodStart: MONDAY,
				periodEnd: "2027-02-14",
				scheduleId: null,
				state: "NOT_GENERATED",
				days: [],
			}),
			"2027-02-11",
			[{ days: { from: "2027-02-11", to: "2027-02-14" }, passed: false }],
		],
		[
			"noScheduleWhollyPast",
			monthWeekFixture({
				periodStart: MONDAY,
				periodEnd: "2027-02-14",
				scheduleId: null,
				state: "NOT_GENERATED",
				days: [],
			}),
			"2027-03-01",
			[],
		],
	])("given_%s_when_read_then_itsGaps", (_case, week, today, gaps) => {
		expect(weekGapsOf(week, today)).toEqual(gaps);
	});
});
