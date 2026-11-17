import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import type { DayRun } from "@/features/scheduling/dates/api";
import {
	partLinesOf,
	type PartLinesSource,
} from "@/features/scheduling/schedules/partLines";

/** Echoes the key and its values, so the lines can be read without copy. */
const t = ((key: string, values?: Record<string, string>) =>
	values ? `${key}(${Object.values(values).join("|")})` : key) as TFunction;
const formatDays = ({ from, to }: DayRun): string => `${from}..${to}`;

/** A part covering Wednesday to Friday of the week of 12 October. */
const MIDWEEK: PartLinesSource = {
	covered: { from: "2026-10-14", to: "2026-10-16" },
	around: { before: undefined, after: undefined, afterTaken: false },
	redo: undefined,
};
const BEFORE: DayRun = { from: "2026-10-12", to: "2026-10-13" };
const AFTER: DayRun = { from: "2026-10-17", to: "2026-10-18" };

describe("partLinesOf", () => {
	it.each<[string, Partial<PartLinesSource>, Array<string>]>([
		["a whole week with no redo", {}, []],
		[
			"days before held by another part",
			{ around: { before: BEFORE, after: undefined, afterTaken: false } },
			["scheduling.roster.otherPart(2026-10-12..2026-10-13)"],
		],
		[
			"days after still to schedule",
			{ around: { before: undefined, after: AFTER, afterTaken: false } },
			[
				"scheduling.roster.coversCallout(2026-10-14..2026-10-16|2026-10-17..2026-10-18)",
			],
		],
		[
			"days after held by a later part",
			{ around: { before: undefined, after: AFTER, afterTaken: true } },
			["scheduling.roster.otherPart(2026-10-17..2026-10-18)"],
		],
		[
			"a redo part, then the days on either side",
			{
				redo: { kind: "beingRedone", days: AFTER },
				around: { before: BEFORE, after: AFTER, afterTaken: true },
			},
			[
				"scheduling.roster.beingRedone(2026-10-17..2026-10-18)",
				"scheduling.roster.otherPart(2026-10-12..2026-10-13)",
				"scheduling.roster.otherPart(2026-10-17..2026-10-18)",
			],
		],
		[
			"this part redoing days",
			{ redo: { kind: "redoing", days: MIDWEEK.covered } },
			["scheduling.roster.redoing(2026-10-14..2026-10-16)"],
		],
	])("says for %s", (_, overrides, lines) => {
		expect(partLinesOf({ ...MIDWEEK, ...overrides }, formatDays, t)).toEqual(
			lines
		);
	});
});
