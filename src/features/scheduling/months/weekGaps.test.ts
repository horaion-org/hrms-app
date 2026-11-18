import { describe, expect, it } from "vitest";
import type { WeekState } from "@/features/scheduling/months/api";
import {
	coverDays,
	monthWeekFixture,
	twoPartWeekFixture,
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

/** The week of 8 Feb 2027: Monday and Tuesday, then Saturday and Sunday, in the given states; Wednesday to Friday without a roster. */
const weekWithParts = ([first, last]: [WeekState, WeekState]): Parameters<
	typeof weekGapsOf
>[0] => {
	const [part] = twoPartWeekFixture();
	return {
		...weekWithout([2, 3, 4]),
		parts: [
			{
				...part!,
				scheduleId: "s-1",
				coveredFrom: "2027-02-08",
				coveredTo: "2027-02-09",
				state: first,
			},
			{
				...part!,
				scheduleId: "s-2",
				coveredFrom: "2027-02-13",
				coveredTo: "2027-02-14",
				state: last,
			},
		],
	};
};

describe("weekGapsOf", () => {
	it.each<[string, Parameters<typeof weekGapsOf>[0], string, Array<WeekGap>]>([
		["aFullWeekCovered", weekWithout([]), "2027-02-01", []],
		[
			"aMiddleGap",
			weekWithout([2, 3, 4]),
			"2027-02-01",
			[{ days: { from: "2027-02-10", to: "2027-02-12" }, kind: "open" }],
		],
		[
			"aGapAtTheStartThatHasPassed",
			weekWithout([0, 1]),
			"2027-02-10",
			[{ days: { from: "2027-02-08", to: "2027-02-09" }, kind: "passed" }],
		],
		[
			"aGapAcrossToday",
			weekWithout([0, 1, 2]),
			"2027-02-09",
			[
				{ days: { from: "2027-02-08", to: "2027-02-08" }, kind: "passed" },
				{ days: { from: "2027-02-09", to: "2027-02-10" }, kind: "open" },
			],
		],
		[
			"aGapAtTheEnd",
			weekWithout([5, 6]),
			"2027-02-01",
			[{ days: { from: "2027-02-13", to: "2027-02-14" }, kind: "open" }],
		],
		[
			"aGapBeforeAPublishedPart",
			weekWithParts(["TO_REVIEW", "PUBLISHED"]),
			"2027-02-01",
			[
				{
					days: { from: "2027-02-10", to: "2027-02-12" },
					kind: "beforePublished",
				},
			],
		],
		[
			"aGapAfterAPublishedPart",
			weekWithParts(["PUBLISHED", "TO_REVIEW"]),
			"2027-02-01",
			[{ days: { from: "2027-02-10", to: "2027-02-12" }, kind: "open" }],
		],
		[
			"aGapBeforeAPartToReview",
			weekWithParts(["TO_REVIEW", "TO_REVIEW"]),
			"2027-02-01",
			[{ days: { from: "2027-02-10", to: "2027-02-12" }, kind: "open" }],
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
			[{ days: { from: "2027-02-08", to: "2027-02-14" }, kind: "open" }],
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
			[{ days: { from: "2027-02-11", to: "2027-02-14" }, kind: "open" }],
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
