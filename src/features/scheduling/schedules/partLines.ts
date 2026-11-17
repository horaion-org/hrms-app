import type { TFunction } from "i18next";
import type { DayRun } from "@/features/scheduling/dates/api";
import {
	dayCountOf,
	type PartRedo,
	type WeekRun,
} from "@/features/scheduling/dates/datesSetup";
import type { WeekPart } from "@/features/scheduling/months/api";

/** What a part of its week says of the week's other days. */
export type PartLinesSource = {
	/** The days this part covers. */
	covered: DayRun;
	/** The week's days outside this part, by what holds them (`weekRunsAround`). */
	runs: ReadonlyArray<WeekRun>;
	/** A redo part touching this one, if any (`partRedoOf`, API ADR-0129). */
	redo: PartRedo | undefined;
};

/** What a line lets the manager do: open the schedule holding its days, or schedule its days. */
export type PartLineAction =
	| {
			kind: "openSchedule";
			part: Pick<WeekPart, "scheduleId" | "state">;
			label: string;
	  }
	| { kind: "scheduleDays"; days: DayRun; label: string };

/** One line about a part's week: what it says, and what it lets the manager do, if anything. */
export type PartLine = { text: string; action?: PartLineAction };

/** The line for one run of the week's days outside this part. */
const runLineOf = (
	run: WeekRun,
	covered: DayRun,
	formatDays: (days: DayRun) => string,
	t: TFunction
): PartLine => {
	const days = formatDays(run.days);
	const count = dayCountOf(run.days.from, run.days.to);
	if (run.kind === "otherPart")
		return {
			text: t("scheduling.roster.otherPart", { days, count }),
			action: {
				kind: "openSchedule",
				part: run.part,
				label: t("scheduling.roster.openOtherPart", { days }),
			},
		};
	if (run.kind === "noneAfter")
		return {
			text: t("scheduling.roster.coversCallout", {
				covered: formatDays(covered),
				rest: days,
			}),
			action: {
				kind: "scheduleDays",
				days: run.days,
				label: t("scheduling.roster.remainingButton", { rest: days }),
			},
		};
	return { text: t(`scheduling.roster.${run.kind}`, { days, count }) };
};

/**
 * The roster page's lines about a part of its week (API ADR-0113), in order:
 * a redo part touching it, then one line per run of the week's other days,
 * in day order. None for a schedule covering its whole week with no redo.
 */
export const partLinesOf = (
	{ covered, runs, redo }: PartLinesSource,
	formatDays: (days: DayRun) => string,
	t: TFunction
): Array<PartLine> => {
	const redoLines = redo
		? [
				{
					text: t(`scheduling.roster.${redo.kind}`, {
						days: formatDays(redo.days),
					}),
				},
			]
		: [];
	return [
		...redoLines,
		...runs.map((run) => runLineOf(run, covered, formatDays, t)),
	];
};
