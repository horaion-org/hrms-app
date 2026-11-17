import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import type { DayRun } from "@/features/scheduling/dates/api";
import type { WeekRun } from "@/features/scheduling/dates/datesSetup";
import {
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
			"days before that no schedule holds",
			{ runs: [{ kind: "noneBefore", days: MONDAY_TUESDAY }] },
			[{ text: "scheduling.roster.noneBefore(2027-02-15..2027-02-16|2)" }],
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
