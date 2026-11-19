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
	/** The first day of the latest-starting published part, if any (`lastPublishedPartStartOf`): days before it are blocked. */
	lastPublishedPartStart?: string;
};

/** A part's fields that say whether it was ever published. */
type PublishedFacts = Pick<WeekPart, "scheduleId" | "state" | "publishedOnce">;

/**
 * Whether a part counts as published for a run by dates, as the API's
 * `WeekRedos.countsAsPublished` does: published now. A part whose
 * publication was withdrawn is a roster to review, which a run by dates
 * works out again.
 */
const countsAsPublished = (part: Pick<WeekPart, "state">): boolean =>
	part.state === "PUBLISHED";

/**
 * Whether a part was ever published: published now, or published once (its
 * publication withdrawn, `publishedOnce`); `withdrawnScheduleIds` names any
 * the caller knows of another way (the schedule on screen, against an older
 * API). The single Regenerate keeps this stricter rule for later parts (API
 * ADR-0134, ADR-0135).
 */
export const wasEverPublished = (
	part: PublishedFacts,
	withdrawnScheduleIds: ReadonlyArray<string> = []
): boolean =>
	part.state === "PUBLISHED" ||
	part.publishedOnce === true ||
	withdrawnScheduleIds.includes(part.scheduleId);

/**
 * The first day of the latest-starting part of the week that counts as
 * published (`countsAsPublished`), or none. A day before it has a published
 * part starting after it, so a dates run asking for it is refused (API
 * ADR-0129, `WeekRedos.refusalOf`); a day on or after it is free.
 */
export const lastPublishedPartStartOf = (
	parts: ReadonlyArray<Pick<WeekPart, "state" | "coveredFrom">>
): string | undefined => {
	const starts = parts
		.filter(countsAsPublished)
		.map((part) => part.coveredFrom)
		.sort();
	return starts[starts.length - 1];
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

/** Whether days come before a part that has been published, so a dates run asking for them is refused (API ADR-0129). */
const comesBeforePublished = (
	days: DayRun,
	lastPublishedPartStart: string | undefined
): boolean =>
	lastPublishedPartStart !== undefined && lastPublishedPartStart > days.from;

/** The line for days with no schedule that come before published days: why they can't be scheduled, no action. */
const beforePublishedLineOf = (
	daysText: string,
	count: number,
	t: TFunction
): PartLine => ({
	text: t("scheduling.roster.noneBeforePublished", { days: daysText, count }),
});

/**
 * The line for days before this part with no schedule, as the API treats a
 * dates run asking for them (API ADR-0129): scheduled, the later unpublished
 * days scheduled again after them; refused while a published part comes after
 * them, which the line says instead of offering an action that can't work.
 */
const noneBeforeLineOf = (
	days: DayRun,
	lastPublishedPartStart: string | undefined,
	formatDays: (days: DayRun) => string,
	t: TFunction
): PartLine => {
	const daysText = formatDays(days);
	const count = dayCountOf(days.from, days.to);
	if (comesBeforePublished(days, lastPublishedPartStart))
		return beforePublishedLineOf(daysText, count, t);
	return {
		text: t("scheduling.roster.noneBefore", { days: daysText, count }),
		action: scheduleDaysAction(days, daysText, t),
	};
};

/** The line for one run of the week's days outside this part. */
const runLineOf = (
	run: WeekRun,
	{ covered, lastPublishedPartStart }: PartLinesSource,
	formatDays: (days: DayRun) => string,
	t: TFunction
): PartLine => {
	const days = formatDays(run.days);
	const count = dayCountOf(run.days.from, run.days.to);
	if (run.kind === "noneBefore")
		return noneBeforeLineOf(run.days, lastPublishedPartStart, formatDays, t);
	if (run.kind === "otherPart")
		return {
			text: t("scheduling.roster.otherPart", { days, count }),
			action: {
				kind: "openSchedule",
				part: run.part,
				label: t("scheduling.roster.openOtherPart", { days }),
			},
		};
	// Days after this part that come before published days can't be scheduled either.
	if (
		run.kind === "noneAfter" &&
		comesBeforePublished(run.days, lastPublishedPartStart)
	)
		return beforePublishedLineOf(days, count, t);
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

/**
 * The days before this part with no schedule that can still be scheduled:
 * those its before-lines offer to schedule (`partLinesOf`). Once this part is
 * published they can't be (API ADR-0129), so publishing warns of them. Pure.
 */
export const daysLeftBeforeOf = (
	lines: ReadonlyArray<PartLine>,
	coveredFrom: string
): Array<DayRun> =>
	lines.flatMap(({ action }) =>
		action?.kind === "scheduleDays" && action.days.to < coveredFrom
			? [action.days]
			: []
	);

/** What deleting a part of its week leaves behind, as the delete dialog says it. */
export type DeleteLeaves = {
	/** This part's days, which have no roster once it is gone; none when no other part shares its week. */
	daysWithoutRoster?: DayRun;
	/** The later parts' days, worked out from this part's days and left as they are; none when one is published. */
	laterDays?: DayRun;
	/**
	 * The published days after this part, when there are any: this part's
	 * days come before them, so once deleted they can never be scheduled
	 * again (API ADR-0129, SCHEDULE_DAYS_BEFORE_ROSTER).
	 */
	publishedLater?: DayRun;
};

/**
 * What deleting the part covering `covered` leaves of its week (`parts`, the
 * week read's parts, this one included): only when other parts share the
 * week, its days with no roster; then either the published days after it
 * (`countsAsPublished`, nearest first, as the API does), which mean its days
 * can't be scheduled again, or else the later parts' days, which were worked
 * out from them and are not changed. Pure.
 */
export const deleteLeavesOf = (
	scheduleId: string,
	covered: DayRun,
	parts: ReadonlyArray<
		Pick<WeekPart, "scheduleId" | "state" | "coveredFrom" | "coveredTo">
	>
): DeleteLeaves => {
	const others = parts.filter((part) => part.scheduleId !== scheduleId);
	if (others.length === 0) return {};
	const later = others
		.filter((part) => part.coveredFrom > covered.to)
		.sort((first, second) =>
			first.coveredFrom.localeCompare(second.coveredFrom)
		);
	const firstLater = later[0];
	const lastLater = later[later.length - 1];
	if (!firstLater || !lastLater) return { daysWithoutRoster: covered };
	// Any published part after these days blocks them; the warning names the nearest one's days.
	const nearestPublished = later.find(countsAsPublished);
	if (nearestPublished)
		return {
			daysWithoutRoster: covered,
			publishedLater: {
				from: nearestPublished.coveredFrom,
				to: nearestPublished.coveredTo,
			},
		};
	return {
		daysWithoutRoster: covered,
		laterDays: { from: firstLater.coveredFrom, to: lastLater.coveredTo },
	};
};

/** Whether a schedule covers only some of its week's days: a part of the week (API ADR-0129). */
export const coversPartOfWeek = (schedule: {
	periodStart: string;
	periodEnd: string;
	coveredFrom: string;
	coveredTo: string;
}): boolean =>
	schedule.coveredFrom !== schedule.periodStart ||
	schedule.coveredTo !== schedule.periodEnd;
