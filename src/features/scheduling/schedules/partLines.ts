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
	/** The first day of the week a published part covers, if any (`firstPublishedDayOf`). */
	firstPublishedDay?: string;
};

/** The first day of the week a published part covers, or none: days before it can't be scheduled (API ADR-0129). */
export const firstPublishedDayOf = (
	parts: ReadonlyArray<Pick<WeekPart, "state" | "coveredFrom">>
): string | undefined =>
	parts
		.filter((part) => part.state === "PUBLISHED")
		.map((part) => part.coveredFrom)
		.sort()[0];

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

/** The action that opens a dates run for a run of days with no schedule. */
const scheduleDaysAction = (
	days: DayRun,
	daysText: string,
	t: TFunction
): PartLineAction => ({
	kind: "scheduleDays",
	days,
	label: t("scheduling.roster.remainingButton", { rest: daysText }),
});

/**
 * The line for days before this part with no schedule, as the API treats a
 * dates run asking for them (API ADR-0129): scheduled, the later unpublished
 * days scheduled again after them; refused while a published part comes after
 * them, which the line says instead of offering an action that can't work.
 */
const noneBeforeLineOf = (
	days: DayRun,
	firstPublishedDay: string | undefined,
	formatDays: (days: DayRun) => string,
	t: TFunction
): PartLine => {
	const daysText = formatDays(days);
	const count = dayCountOf(days.from, days.to);
	if (firstPublishedDay !== undefined && firstPublishedDay > days.from)
		return {
			text: t("scheduling.roster.noneBeforePublished", {
				days: daysText,
				count,
			}),
		};
	return {
		text: t("scheduling.roster.noneBefore", { days: daysText, count }),
		action: scheduleDaysAction(days, daysText, t),
	};
};

/** The line for one run of the week's days outside this part. */
const runLineOf = (
	run: WeekRun,
	{ covered, firstPublishedDay }: PartLinesSource,
	formatDays: (days: DayRun) => string,
	t: TFunction
): PartLine => {
	const days = formatDays(run.days);
	const count = dayCountOf(run.days.from, run.days.to);
	if (run.kind === "noneBefore")
		return noneBeforeLineOf(run.days, firstPublishedDay, formatDays, t);
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
			action: scheduleDaysAction(run.days, days, t),
		};
	return { text: t(`scheduling.roster.${run.kind}`, { days, count }) };
};

/**
 * The roster page's lines about a part of its week (API ADR-0113), in order:
 * a redo part touching it, then one line per run of the week's other days,
 * in day order. None for a schedule covering its whole week with no redo.
 */
export const partLinesOf = (
	source: PartLinesSource,
	formatDays: (days: DayRun) => string,
	t: TFunction
): Array<PartLine> => {
	const { runs, redo } = source;
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
		...runs.map((run) => runLineOf(run, source, formatDays, t)),
	];
};
