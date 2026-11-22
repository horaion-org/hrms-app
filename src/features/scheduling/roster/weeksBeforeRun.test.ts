import { describe, expect, it } from "vitest";
import { daysOf } from "@/common/weeks";
import type { RosterRow } from "@/features/scheduling/roster/roster";
import type { RosterWeek } from "@/features/scheduling/roster/RosterWeekBar";
import {
	beforeRunColumnsOf,
	daysBeforeByMemberOf,
	daysOfRosterPeople,
	daysShownBeforeRun,
	enteredNoteOf,
	monthBeforeRunOf,
	type MonthRead,
	type MonthsBeforeRun,
	monthsBeforeRunOf,
	mondaysShownBeforeRun,
	shownWeekOf,
	withWeeksBeforeRun,
} from "@/features/scheduling/roster/weeksBeforeRun";
import type { DayBeforeRun } from "@/features/scheduling/startingContext/daysBeforeRun";

/*
 * Two runs: one starting Monday 16 November 2026 (its 14 days before are
 * 2–15 November, the weeks of 2 and 9 November), one starting Thursday 19
 * November (5–18 November: Thursday to Sunday of the week of 2 November, the
 * week of 9 November, and Monday to Wednesday of its own first week).
 */
const MONDAY_RUN = "2026-11-16";
const THURSDAY_RUN = "2026-11-19";

/** Someone's day before the run: a rostered day off unless entered by hand. */
const dayOf = (
	date: string,
	memberProfileId = "p-tan",
	enteredByHand = false
): DayBeforeRun => ({
	memberProfileId,
	date,
	what: { kind: "off", dayType: null },
	enteredByHand,
});

/** A month week: choosable when it has a schedule. */
const monthWeek = (start: string, hasSchedule: boolean): RosterWeek => ({
	start,
	end: daysOf(start)[6]!,
	state: hasSchedule ? "Published" : "No schedule",
	disabled: !hasSchedule,
});

/** November 2026 with no schedule before the week of 16 November. */
const NOVEMBER = [
	monthWeek("2026-11-02", false),
	monthWeek("2026-11-09", false),
	monthWeek("2026-11-16", true),
	monthWeek("2026-11-23", true),
];

describe("daysOfRosterPeople", () => {
	it("keeps the days of people on the roster whose member still resolves", () => {
		const rows = [
			{ membershipId: "m-tan", memberProfileId: "p-tan" },
			{ membershipId: null, memberProfileId: "p-gone" },
		] as Array<RosterRow>;
		expect(
			daysOfRosterPeople(
				[
					dayOf("2026-11-10"),
					dayOf("2026-11-10", "p-other"),
					dayOf("2026-11-10", "p-gone"),
				],
				rows
			)
		).toEqual([dayOf("2026-11-10")]);
	});
});

describe("monthBeforeRunOf", () => {
	it.each([
		[
			"a run whose 14 days are all in weeks of its own month",
			"2026-11-16",
			undefined,
		],
		["a run in its month's first week", "2026-12-07", "2026-11"],
		[
			"a run whose oldest week before starts on its month's first Monday",
			"2027-03-15",
			undefined,
		],
		[
			"a Thursday run whose oldest day falls in a week of the month before",
			"2027-03-04",
			"2027-02",
		],
		// Its first week (29 Mar – 4 Apr) is March's, as is the week of its oldest day.
		[
			"a run starting on 1 April, in a week that straddles March and April",
			"2027-04-01",
			undefined,
		],
		[
			"a run in January, whose month before is December",
			"2027-01-04",
			"2026-12",
		],
	])("asks for %s: %s", (_name, firstDay, expected) => {
		expect(monthBeforeRunOf(firstDay)).toBe(expected);
	});
});

describe("monthsBeforeRunOf", () => {
	const read = (
		weeks: Array<[string, string | null]>,
		isLoading = false
	): MonthRead => ({
		isLoading,
		data: {
			weeks: weeks.map(([periodStart, scheduleId]) => ({
				periodStart,
				scheduleId,
			})),
		},
	});
	const NOT_READ: MonthRead = { isLoading: false, data: undefined };
	it.each<[string, Array<MonthRead>, MonthsBeforeRun]>([
		[
			"both months read: the Mondays they list without a schedule",
			[
				read([
					["2026-12-07", "s-1"],
					["2026-12-14", null],
				]),
				read([
					["2026-11-23", null],
					["2026-11-30", "s-0"],
				]),
			],
			{ mondaysWithoutSchedule: ["2026-12-14", "2026-11-23"], reading: false },
		],
		[
			"the month before still being read",
			[read([["2026-12-07", "s-1"]]), { isLoading: true, data: undefined }],
			{ mondaysWithoutSchedule: [], reading: true },
		],
		[
			"the month before failed, or not asked for: it lists nothing and is not reading",
			[read([["2026-12-14", null]]), NOT_READ],
			{ mondaysWithoutSchedule: ["2026-12-14"], reading: false },
		],
	])("gives %s", (_name, reads, expected) => {
		expect(monthsBeforeRunOf(reads)).toEqual(expected);
	});
});

describe("mondaysShownBeforeRun", () => {
	/** November's Mondays the month read lists without a schedule. */
	const NOVEMBER_FREE = ["2026-11-02", "2026-11-09"];
	it.each<[string, string, Array<DayBeforeRun>, Array<string>, Array<string>]>([
		["nothing known", MONDAY_RUN, [], NOVEMBER_FREE, []],
		[
			"a day in each week before a Monday run",
			MONDAY_RUN,
			[dayOf("2026-11-02"), dayOf("2026-11-15")],
			NOVEMBER_FREE,
			["2026-11-02", "2026-11-09"],
		],
		[
			"the oldest known day deciding how far: only the week before",
			MONDAY_RUN,
			[dayOf("2026-11-12")],
			NOVEMBER_FREE,
			["2026-11-09"],
		],
		[
			"a Thursday run's first-week days, which are not a week before",
			THURSDAY_RUN,
			[dayOf("2026-11-17")],
			NOVEMBER_FREE,
			[],
		],
		[
			"a Thursday run's oldest week, two Mondays back",
			THURSDAY_RUN,
			[dayOf("2026-11-05")],
			NOVEMBER_FREE,
			["2026-11-02"],
		],
		[
			"a Monday a read lists with a schedule: never offered",
			MONDAY_RUN,
			[dayOf("2026-11-10")],
			["2026-11-02"],
			[],
		],
		[
			"a Monday the month before lists without a schedule",
			"2026-12-07",
			[dayOf("2026-11-30")],
			["2026-11-30"],
			["2026-11-30"],
		],
		[
			"a Monday no read lists: not known, so not shown",
			"2026-12-07",
			[dayOf("2026-11-30")],
			[],
			[],
		],
		[
			"a week holding nothing between two that hold something",
			THURSDAY_RUN,
			[dayOf("2026-11-06"), dayOf("2026-11-17")],
			NOVEMBER_FREE,
			["2026-11-02"],
		],
		[
			"a day older than the 14",
			MONDAY_RUN,
			[dayOf("2026-11-01")],
			["2026-10-26"],
			[],
		],
	])("gives %s", (_name, firstDay, days, mondaysWithoutSchedule, expected) => {
		expect(
			mondaysShownBeforeRun(firstDay, days, mondaysWithoutSchedule)
		).toEqual(expected);
	});
});

describe("daysShownBeforeRun", () => {
	it("keeps the first week's days and those of the weeks shown", () => {
		const days = [
			dayOf("2026-11-06"),
			dayOf("2026-11-10"),
			dayOf("2026-11-17"),
		];
		expect(daysShownBeforeRun(THURSDAY_RUN, days, ["2026-11-09"])).toEqual([
			dayOf("2026-11-10"),
			dayOf("2026-11-17"),
		]);
	});
});

describe("beforeRunColumnsOf", () => {
	const firstWeek = daysOf("2026-11-16");
	it.each([
		[
			"a Thursday run's first week with a known Tuesday",
			firstWeek,
			[dayOf("2026-11-17")],
			["2026-11-16", "2026-11-17", "2026-11-18"],
		],
		[
			"a Thursday run's first week with nothing known in it",
			firstWeek,
			[dayOf("2026-11-10")],
			[],
		],
		[
			"a week wholly before the run, cut at the 14-day edge",
			daysOf("2026-11-02"),
			[dayOf("2026-11-05")],
			["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"],
		],
	])("gives %s", (_name, weekDays, shownDays, expected) => {
		expect(beforeRunColumnsOf(weekDays, THURSDAY_RUN, shownDays)).toEqual(
			expected
		);
	});
});

describe("daysBeforeByMemberOf", () => {
	it("looks each day up by person, then date", () => {
		const byMember = daysBeforeByMemberOf([
			dayOf("2026-11-10"),
			dayOf("2026-11-11"),
			dayOf("2026-11-10", "p-siti"),
		]);
		expect(Object.keys(byMember.get("p-tan") ?? {})).toEqual([
			"2026-11-10",
			"2026-11-11",
		]);
		expect(byMember.get("p-siti")?.["2026-11-10"]).toEqual(
			dayOf("2026-11-10", "p-siti")
		);
	});
});

describe("shownWeekOf", () => {
	const input = {
		requested: undefined,
		today: "2026-11-01",
		period: { start: "2026-11-16", end: "2026-11-22" },
		firstDay: MONDAY_RUN,
		mondaysShown: ["2026-11-09"],
		reading: false,
	};
	it.each([
		["the schedule's own week by default", {}, "2026-11-16"],
		[
			"this week when the schedule covers it",
			{ today: "2026-11-18" },
			"2026-11-16",
		],
		[
			"this week before the run never by itself",
			{ today: "2026-11-11" },
			"2026-11-16",
		],
		[
			"a URL week shown before the run",
			{ requested: "2026-11-09" },
			"2026-11-09",
		],
		[
			"a URL week before the run while reading",
			{ requested: "2026-11-02", mondaysShown: [], reading: true },
			"2026-11-02",
		],
		[
			"a URL week before the run once the read ends with nothing",
			{ requested: "2026-11-02", mondaysShown: [] },
			"2026-11-16",
		],
		[
			"a URL week past the 14 days, even while reading",
			{ requested: "2026-10-26", reading: true },
			"2026-11-16",
		],
		[
			"a URL week the month gives its own schedule",
			{ requested: "2026-11-02" },
			"2026-11-16",
		],
		[
			"a URL week after the schedule",
			{ requested: "2026-11-23" },
			"2026-11-16",
		],
	])("gives %s", (_name, change, expected) => {
		expect(shownWeekOf({ ...input, ...change })).toBe(expected);
	});
});

describe("withWeeksBeforeRun", () => {
	it("replaces a week without a schedule and adds one the month does not list", () => {
		const weeks = withWeeksBeforeRun(
			[monthWeek("2026-11-02", false), monthWeek("2026-11-09", true)],
			["2026-10-26", "2026-11-02"],
			"Before these days"
		);
		expect(weeks).toEqual([
			{ start: "2026-10-26", end: "2026-11-01", state: "Before these days" },
			{ start: "2026-11-02", end: "2026-11-08", state: "Before these days" },
			monthWeek("2026-11-09", true),
		]);
	});

	it("leaves the weeks as they are with none shown before the run", () => {
		expect(withWeeksBeforeRun(NOVEMBER, [], "Before these days")).toEqual(
			NOVEMBER
		);
	});
});

describe("enteredNoteOf", () => {
	const shown = (
		days: Array<DayBeforeRun>,
		mondaysShown: Array<string>
	): ReturnType<typeof enteredNoteOf> =>
		enteredNoteOf(daysShownBeforeRun(MONDAY_RUN, days, mondaysShown));
	it.each([
		[
			"several people, the newest of two weeks",
			[
				dayOf("2026-11-03", "p-tan", true),
				dayOf("2026-11-11", "p-siti", true),
				dayOf("2026-11-12", "p-tan", true),
			],
			["2026-11-02", "2026-11-09"],
			{ count: 2, week: "2026-11-09" },
		],
		[
			"an entered day in a week with its own schedule: not counted",
			[dayOf("2026-11-03", "p-tan", true), dayOf("2026-11-11", "p-siti", true)],
			["2026-11-02"],
			{ count: 1, week: "2026-11-02" },
		],
		["rostered days only", [dayOf("2026-11-11")], ["2026-11-09"], undefined],
		["nothing", [], [], undefined],
	])("gives %s", (_name, days, mondaysShown, expected) => {
		expect(shown(days, mondaysShown)).toEqual(expected);
	});
});
