import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import type { DayRun } from "@/features/scheduling/dates/api";
import type { WeekRun } from "@/features/scheduling/dates/datesSetup";
import {
	daysLeftBeforeOf,
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
			parts: [{ state: "TO_REVIEW", coveredFrom: "2027-02-15" }],
			expected: undefined,
		},
		{
			case: "two published parts",
			parts: [
				{ state: "PUBLISHED", coveredFrom: "2027-02-19" },
				{ state: "TO_REVIEW", coveredFrom: "2027-02-15" },
				{ state: "PUBLISHED", coveredFrom: "2027-02-17" },
			],
			expected: "2027-02-17",
		},
	] as const)("given_$case_when_read_then_$expected", ({ parts, expected }) => {
		expect(firstPublishedDayOf(parts)).toBe(expected);
	});
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
