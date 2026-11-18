import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import type { DayRun } from "@/features/scheduling/dates/api";
import type { WeekRun } from "@/features/scheduling/dates/datesSetup";
import type { WeekState } from "@/features/scheduling/months/api";
import {
	coversPartOfWeek,
	daysLeftBeforeOf,
	deleteLeavesOf,
	firstPublishedDayOf,
	partLinesOf,
	type PartLine,
	type PartLinesSource,
} from "@/features/scheduling/schedules/partLines";

/** Echoes the key and its values, so the lines can be read without copy. */
const t = ((key: string, values?: Record<string, string | number>) =>
	values ? `${key}(${Object.values(values).join("|")})` : key) as TFunction;
const formatDays = ({ from, to }: DayRun): string => `${from}..${to}`;

/** A part covering Wednesday to Friday of the week of 15 February 2027. */
const MIDWEEK: PartLinesSource = {
	covered: { from: "2027-02-17", to: "2027-02-19" },
	runs: [],
	redo: undefined,
};
const MONDAY_TUESDAY: DayRun = { from: "2027-02-15", to: "2027-02-16" };
const WEEKEND: DayRun = { from: "2027-02-20", to: "2027-02-21" };
const WEEKEND_PART = { scheduleId: "s-2", state: "TO_REVIEW" } as const;

describe("partLinesOf", () => {
	it.each<[string, Partial<PartLinesSource>, Array<PartLine>]>([
		["a whole week with no redo", {}, []],
		[
			"days before an unpublished part, still to come",
			{ runs: [{ kind: "noneBefore", days: MONDAY_TUESDAY }] },
			[
				{
					text: "scheduling.roster.noneBefore(2027-02-15..2027-02-16|2)",
					action: {
						kind: "scheduleDays",
						days: MONDAY_TUESDAY,
						label: "scheduling.roster.remainingButton(2027-02-15..2027-02-16)",
					},
				},
			],
		],
		[
			"days before a published part",
			{
				runs: [{ kind: "noneBefore", days: MONDAY_TUESDAY }],
				firstPublishedDay: "2027-02-17",
			},
			[
				{
					text: "scheduling.roster.noneBeforePublished(2027-02-15..2027-02-16|2)",
				},
			],
		],
		[
			"days after a published part, before this one",
			{
				runs: [{ kind: "noneBefore", days: MONDAY_TUESDAY }],
				firstPublishedDay: "2027-02-15",
			},
			[
				{
					text: "scheduling.roster.noneBefore(2027-02-15..2027-02-16|2)",
					action: {
						kind: "scheduleDays",
						days: MONDAY_TUESDAY,
						label: "scheduling.roster.remainingButton(2027-02-15..2027-02-16)",
					},
				},
			],
		],
		[
			"days before that have passed with no schedule",
			{ runs: [{ kind: "passedBefore", days: MONDAY_TUESDAY }] },
			[{ text: "scheduling.roster.passedBefore(2027-02-15..2027-02-16|2)" }],
		],
		[
			"days after still to schedule",
			{ runs: [{ kind: "noneAfter", days: WEEKEND }] },
			[
				{
					text: "scheduling.roster.coversCallout(2027-02-17..2027-02-19|2027-02-20..2027-02-21)",
					action: {
						kind: "scheduleDays",
						days: WEEKEND,
						label: "scheduling.roster.remainingButton(2027-02-20..2027-02-21)",
					},
				},
			],
		],
		[
			"days another part holds",
			{ runs: [{ kind: "otherPart", days: WEEKEND, part: WEEKEND_PART }] },
			[
				{
					text: "scheduling.roster.otherPart(2027-02-20..2027-02-21|2)",
					action: {
						kind: "openSchedule",
						part: WEEKEND_PART,
						label: "scheduling.roster.openOtherPart(2027-02-20..2027-02-21)",
					},
				},
			],
		],
		[
			"this part redoing days",
			{ redo: { kind: "redoing", days: MIDWEEK.covered } },
			[{ text: "scheduling.roster.redoing(2027-02-17..2027-02-19)" }],
		],
	])("says for %s", (_, overrides, lines) => {
		expect(partLinesOf({ ...MIDWEEK, ...overrides }, formatDays, t)).toEqual(
			lines
		);
	});

	it("given_aRedoAndRunsOnBothSides_when_said_then_theRedoFirstThenTheRunsInDayOrder", () => {
		const runs: Array<WeekRun> = [
			{ kind: "noneBefore", days: MONDAY_TUESDAY },
			{ kind: "otherPart", days: WEEKEND, part: WEEKEND_PART },
		];

		expect(
			partLinesOf(
				{ ...MIDWEEK, runs, redo: { kind: "beingRedone", days: WEEKEND } },
				formatDays,
				t
			).map((line) => line.text)
		).toEqual([
			"scheduling.roster.beingRedone(2027-02-20..2027-02-21)",
			"scheduling.roster.noneBefore(2027-02-15..2027-02-16|2)",
			"scheduling.roster.otherPart(2027-02-20..2027-02-21|2)",
		]);
	});
});

describe("firstPublishedDayOf", () => {
	it.each([
		{
			case: "no part published",
			parts: [
				{ scheduleId: "s-1", state: "TO_REVIEW", coveredFrom: "2027-02-15" },
			],
			withdrawn: [],
			expected: undefined,
		},
		{
			case: "two published parts",
			parts: [
				{ scheduleId: "s-3", state: "PUBLISHED", coveredFrom: "2027-02-19" },
				{ scheduleId: "s-1", state: "TO_REVIEW", coveredFrom: "2027-02-15" },
				{ scheduleId: "s-2", state: "PUBLISHED", coveredFrom: "2027-02-17" },
			],
			withdrawn: [],
			expected: "2027-02-17",
		},
		// Taken back, it reads as to review again, but the API still counts it as published.
		{
			case: "a part whose publication was withdrawn",
			parts: [
				{ scheduleId: "s-1", state: "TO_REVIEW", coveredFrom: "2027-02-17" },
			],
			withdrawn: ["s-1"],
			expected: "2027-02-17",
		},
		{
			case: "a part the week read says was published once",
			parts: [
				{
					scheduleId: "s-2",
					state: "TO_REVIEW",
					coveredFrom: "2027-02-19",
					publishedOnce: true,
				},
			],
			withdrawn: [],
			expected: "2027-02-19",
		},
	] as const)(
		"given_$case_when_read_then_$expected",
		({ parts, withdrawn, expected }) => {
			expect(firstPublishedDayOf(parts, withdrawn)).toBe(expected);
		}
	);
});

describe("daysLeftBeforeOf", () => {
	const linesOf = (overrides: Partial<PartLinesSource>): Array<PartLine> =>
		partLinesOf({ ...MIDWEEK, ...overrides }, formatDays, t);

	it.each([
		{
			case: "days before still to come",
			source: { runs: [{ kind: "noneBefore", days: MONDAY_TUESDAY }] },
			expected: [MONDAY_TUESDAY],
		},
		{
			case: "days before already rostered",
			source: {
				runs: [{ kind: "otherPart", days: MONDAY_TUESDAY, part: WEEKEND_PART }],
			},
			expected: [],
		},
		{
			case: "days before that have passed",
			source: { runs: [{ kind: "passedBefore", days: MONDAY_TUESDAY }] },
			expected: [],
		},
		{
			case: "days before a published part",
			source: {
				runs: [{ kind: "noneBefore", days: MONDAY_TUESDAY }],
				firstPublishedDay: "2027-02-17",
			},
			expected: [],
		},
		{
			case: "only days after",
			source: { runs: [{ kind: "noneAfter", days: WEEKEND }] },
			expected: [],
		},
		{ case: "not a part of its week", source: {}, expected: [] },
	] as Array<{
		case: string;
		source: Partial<PartLinesSource>;
		expected: Array<DayRun>;
	}>)("given_$case_when_read_then_warnsOfThoseDays", ({ source, expected }) => {
		expect(daysLeftBeforeOf(linesOf(source), MIDWEEK.covered.from)).toEqual(
			expected
		);
	});
});

describe("deleteLeavesOf", () => {
	const MONDAY_TO_TUESDAY = {
		state: "TO_REVIEW" as WeekState,
		scheduleId: "s-0",
		coveredFrom: "2027-02-15",
		coveredTo: "2027-02-16",
	};
	const WEDNESDAY_TO_FRIDAY = {
		state: "TO_REVIEW" as WeekState,
		scheduleId: "s-1",
		coveredFrom: "2027-02-17",
		coveredTo: "2027-02-19",
	};
	const SATURDAY = {
		state: "TO_REVIEW" as WeekState,
		scheduleId: "s-2",
		coveredFrom: "2027-02-20",
		coveredTo: "2027-02-20",
	};
	const SUNDAY = {
		state: "TO_REVIEW" as WeekState,
		scheduleId: "s-3",
		coveredFrom: "2027-02-21",
		coveredTo: "2027-02-21",
	};
	const daysOf = (part: typeof MONDAY_TO_TUESDAY): DayRun => ({
		from: part.coveredFrom,
		to: part.coveredTo,
	});

	it.each([
		{
			case: "the only part of its week",
			shown: WEDNESDAY_TO_FRIDAY,
			parts: [WEDNESDAY_TO_FRIDAY],
			expected: {},
		},
		{
			case: "a middle part",
			shown: WEDNESDAY_TO_FRIDAY,
			parts: [MONDAY_TO_TUESDAY, WEDNESDAY_TO_FRIDAY, SATURDAY, SUNDAY],
			expected: {
				daysWithoutRoster: daysOf(WEDNESDAY_TO_FRIDAY),
				laterDays: { from: "2027-02-20", to: "2027-02-21" },
			},
		},
		{
			case: "the first part with a later one",
			shown: MONDAY_TO_TUESDAY,
			parts: [MONDAY_TO_TUESDAY, WEDNESDAY_TO_FRIDAY],
			expected: {
				daysWithoutRoster: daysOf(MONDAY_TO_TUESDAY),
				laterDays: daysOf(WEDNESDAY_TO_FRIDAY),
			},
		},
		{
			case: "the last part",
			shown: SUNDAY,
			parts: [WEDNESDAY_TO_FRIDAY, SUNDAY],
			expected: { daysWithoutRoster: daysOf(SUNDAY) },
		},
		{
			// The tester's week: deleting the middle part before a published one loses its days for good.
			case: "a middle part before a published part",
			shown: WEDNESDAY_TO_FRIDAY,
			parts: [
				MONDAY_TO_TUESDAY,
				WEDNESDAY_TO_FRIDAY,
				SATURDAY,
				{ ...SUNDAY, state: "PUBLISHED" },
			],
			expected: {
				daysWithoutRoster: daysOf(WEDNESDAY_TO_FRIDAY),
				publishedLater: daysOf(SUNDAY),
			},
		},
		{
			// Taken back, it reads as to review; only a caller that knows it was withdrawn can say so.
			case: "a middle part before a withdrawn part the caller knows of",
			shown: WEDNESDAY_TO_FRIDAY,
			parts: [WEDNESDAY_TO_FRIDAY, SATURDAY],
			withdrawn: [SATURDAY.scheduleId],
			expected: {
				daysWithoutRoster: daysOf(WEDNESDAY_TO_FRIDAY),
				publishedLater: daysOf(SATURDAY),
			},
		},
		{
			case: "a middle part before a withdrawn part, known through publishedOnce",
			shown: WEDNESDAY_TO_FRIDAY,
			parts: [WEDNESDAY_TO_FRIDAY, { ...SATURDAY, publishedOnce: true }],
			expected: {
				daysWithoutRoster: daysOf(WEDNESDAY_TO_FRIDAY),
				publishedLater: daysOf(SATURDAY),
			},
		},
		{
			case: "a middle part before a withdrawn part the caller doesn't know of",
			shown: WEDNESDAY_TO_FRIDAY,
			parts: [WEDNESDAY_TO_FRIDAY, SATURDAY],
			expected: {
				daysWithoutRoster: daysOf(WEDNESDAY_TO_FRIDAY),
				laterDays: daysOf(SATURDAY),
			},
		},
	] as Array<{
		case: string;
		shown: typeof WEDNESDAY_TO_FRIDAY;
		parts: Array<typeof WEDNESDAY_TO_FRIDAY & { publishedOnce?: boolean }>;
		withdrawn?: Array<string>;
		expected: object;
	}>)(
		"given_$case_when_deleted_then_saysWhatItLeaves",
		({ shown, parts, withdrawn, expected }) => {
			expect(
				deleteLeavesOf(shown.scheduleId, daysOf(shown), parts, withdrawn)
			).toEqual(expected);
		}
	);
});

describe("coversPartOfWeek", () => {
	it.each([
		["the whole week", "2027-02-08", "2027-02-14", false],
		["the week's middle days", "2027-02-10", "2027-02-12", true],
		["the week's first days", "2027-02-08", "2027-02-09", true],
		["the week's last days", "2027-02-13", "2027-02-14", true],
	])("covering %s is %s", (_, coveredFrom, coveredTo, expected) => {
		expect(
			coversPartOfWeek({
				periodStart: "2027-02-08",
				periodEnd: "2027-02-14",
				coveredFrom,
				coveredTo,
			})
		).toBe(expected);
	});
});
