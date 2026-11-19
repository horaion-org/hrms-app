import type { TFunction } from "i18next";
import { formatDay } from "@/common/formatDay";
import type { DatesPlan, DayRun } from "@/features/scheduling/dates/api";
import type {
	ScheduleMonth,
	WeekState,
} from "@/features/scheduling/months/api";
import { weeksNoLongerCovered } from "@/features/scheduling/months/monthGeneration";
import {
	formatMonth,
	formatWeekDates,
	stateCounts,
} from "@/features/scheduling/months/monthWeeks";
import {
	tickedRangesOf,
	type TickableWeek,
} from "@/features/scheduling/months/weekTicks";
import { dayCountOfRuns } from "@/features/scheduling/dates/datesSetup";
import {
	replacedDaysOf,
	type ReplacedDays,
} from "@/features/scheduling/dates/replacedDays";
import { formatPeriod } from "@/features/scheduling/periods";
import type { Gate } from "@/features/scheduling/readiness/readinessCopy";
import type { WeekChoiceIds } from "@/features/scheduling/weekChoice";

/*
 * The months' words that take the person's language, kept apart from the
 * pure dates and weeks of `monthWeeks.ts`, as readiness keeps its copy in
 * `readinessCopy.ts`.
 */

/** The order the summary line names the states in. */
const COUNTED_STATES: ReadonlyArray<Exclude<WeekState, "NOT_GENERATED">> = [
	"PUBLISHED",
	"TO_REVIEW",
	"GENERATING",
	"FAILED",
	"REJECTED",
	"DRAFT",
	"UNKNOWN",
];

/** The month's weeks counted by state as one line, e.g. "2 published · 3 to review". */
export const stateCountsLine = (
	weeks: ReadonlyArray<{ state: WeekState }>,
	t: TFunction
): string => {
	const counts = stateCounts(weeks);
	return COUNTED_STATES.filter((state) => counts[state] !== undefined)
		.map((state) =>
			t(`scheduling.months.counts.${state}`, { count: counts[state] ?? 0 })
		)
		.join(" · ");
};

/** A week's or a range's dates in the person's language, e.g. "Mon 23 Nov to Sun 29 Nov". */
export const weekRangeText = (
	range: { start: string; end: string },
	language: string,
	t: TFunction
): string =>
	t("scheduling.months.setup.weekDates", {
		from: formatDay(range.start, language),
		to: formatDay(range.end, language),
	});

/**
 * What Generate says of a chosen week that holds a roster: one published once
 * is left as it is; otherwise generating again replaces it; on a week of several schedules, only the newest part's days,
 * the other days staying as they are for Dates to schedule again; on a week
 * of one schedule covering some days, only those, the others having no roster.
 */
export const replacingNoteOf = (
	week: TickableWeek,
	language: string,
	t: TFunction
): string => {
	const weekText = weekRangeText(
		{ start: week.periodStart, end: week.periodEnd },
		language,
		t
	);
	// A month run leaves a week published once as it is: nothing is replaced.
	if (week.note === "oncePublished")
		return t("scheduling.months.setup.oncePublishedNote", { week: weekText });
	const rejected = week.note === "rosterRejected";
	const split = week.splitReplacement;
	if (!split)
		return rejected
			? t("scheduling.months.setup.rosterRejectedNote", { week: weekText })
			: t("scheduling.months.setup.rosterWaitingNote", { week: weekText });
	const runText = (run: DayRun): string =>
		formatPeriod({ start: run.from, end: run.to }, language);
	const listText = (runs: Array<DayRun>): string =>
		new Intl.ListFormat(language, { type: "conjunction" }).format(
			runs.map(runText)
		);
	if (split.withoutRoster.length > 0) {
		const partialKey = rejected
			? "scheduling.months.setup.rosterRejectedPartialNote"
			: "scheduling.months.setup.rosterWaitingPartialNote";
		return t(partialKey, {
			week: weekText,
			replaced: runText(split.replaced),
			withoutRoster: listText(split.withoutRoster),
			count: dayCountOfRuns(split.withoutRoster),
		});
	}
	const partKey = rejected
		? "scheduling.months.setup.rosterRejectedPartNote"
		: "scheduling.months.setup.rosterWaitingPartNote";
	return t(partKey, {
		week: weekText,
		replaced: runText(split.replaced),
		staying: listText(split.staying),
		count: dayCountOfRuns(split.staying),
	});
};

/** Why Setup's list can't tick a week of several schedules whose newest is published; undefined for any other week. */
export const newestPublishedNoteOf = (
	week: TickableWeek,
	language: string,
	t: TFunction
): string | undefined => {
	const published = week.newestPublished;
	if (!published) return undefined;
	return t("scheduling.months.setup.newestPublishedNote", {
		published: formatPeriod(
			{ start: published.from, end: published.to },
			language
		),
	});
};

/** Why a week a run sent can't be generated now, as the month read shows it. */
const whyNotGenerated = (
	state: WeekState
): "PUBLISHED" | "GENERATING" | "ENDED" =>
	state === "PUBLISHED" || state === "GENERATING" ? state : "ENDED";

/**
 * A run refused because a week it sent changed since the page read the month
 * (the API's MONTH_WEEK_CANNOT_BE_GENERATED): each such week and why, from
 * the month read again, then that nothing was generated and the page shows
 * the month as it is. Until the new read names the week, one line for the month.
 */
export const weekChangedRefusal = (
	sent: ReadonlyArray<string>,
	month: ScheduleMonth,
	language: string,
	t: TFunction
): string => {
	const key = "scheduling.months.generate";
	const monthName = formatMonth(month.month, language);
	const changed = weeksNoLongerCovered(sent, month);
	if (changed.length === 0)
		return t(`${key}.weekChanged`, { month: monthName });
	return [
		...changed.map((week) =>
			t(`${key}.weekStopped.${whyNotGenerated(week.state)}`, {
				week: formatWeekDates(
					{ start: week.periodStart, end: week.periodEnd },
					language
				),
			})
		),
		t(`${key}.weekStoppedNext`, { month: monthName }),
	].join(" ");
};

/** Where the month wizard's own copy lives. */
const CREATE_KEY = "scheduling.months.create";

/** One week of the month a run creates: its dates as words, and how many shifts and constraints it leaves out. */
export type WeekUses = { label: string; leftOut: number };

/**
 * What the month's weeks use, as one line: every week everything, or how
 * many weeks use everything and which leave something out.
 */
export const monthUsesLine = (
	t: TFunction,
	weeks: ReadonlyArray<WeekUses>,
	everything: WeekChoiceIds,
	department: string,
	language: string
): string => {
	const changed = weeks.filter((week) => week.leftOut > 0);
	if (changed.length === 0)
		return t(`${CREATE_KEY}.usesEveryWeek`, {
			shifts: t("scheduling.week.shiftsAll", {
				count: everything.shiftIds.length,
			}),
			constraints: t("scheduling.week.constraintCount", {
				count: everything.constraintIds.length,
			}),
			department,
		});
	return t(`${CREATE_KEY}.usesSomeWeeks`, {
		count: weeks.length - changed.length,
		total: weeks.length,
		department,
		changed: new Intl.ListFormat(language, { type: "conjunction" }).format(
			changed.map((week) =>
				t(`${CREATE_KEY}.changedWeek`, {
					week: week.label,
					count: week.leftOut,
				})
			)
		),
	});
};

/** What the month wizard's Setup knows when it decides whether Next waits. */
export type SetupNextFacts = {
	/** The readiness gate, while the chosen Department can't roster anyone. */
	gate: Gate | undefined;
	/** The chosen Department's name; none before a Department is chosen. */
	departmentName: string | undefined;
	/** Whether the person may not read the Department's shifts or its constraints. */
	listsHidden: boolean;
	/** Whether the Department's shifts and constraints and the month's weeks have been read. */
	listsRead: boolean;
	/** Whether the run has nothing to generate yet: no week ticked, or dates without new days. */
	nothingToGenerate: boolean;
};

/**
 * The note under Setup's Next, and whether Next waits: the gate's note, the
 * lists the person may not see, or no note ("") while the lists load or the
 * run has nothing to generate (the list itself says so). Undefined lets Next
 * submit the form.
 */
export const setupNextNoteOf = (
	facts: SetupNextFacts,
	t: TFunction
): string | undefined => {
	const { gate, departmentName, listsHidden } = facts;
	if (gate) return t(gate.nextNoteKey, { department: gate.department });
	if (listsHidden && departmentName !== undefined)
		return t("scheduling.week.listsHiddenNote", { department: departmentName });
	const listsWaiting =
		departmentName !== undefined && !listsHidden && !facts.listsRead;
	return listsWaiting || facts.nothingToGenerate ? "" : undefined;
};

/** The Generate panel's line for the ticked weeks, joined where they touch, as Setup's list names them; empty for none. */
export const tickedWeeksHint = (
	ticked: ReadonlyArray<string>,
	language: string,
	t: TFunction
): string =>
	ticked.length === 0
		? ""
		: t("scheduling.months.generate.panel.hintChosen", {
				count: ticked.length,
				ranges: new Intl.ListFormat(language, { type: "conjunction" }).format(
					tickedRangesOf(ticked).map((range) =>
						weekRangeText(range, language, t)
					)
				),
			});

/** A dates run's new days, from the first to the last, e.g. "4 – 10 Jan 2027"; undefined without a plan or new days. */
const datesRunRange = (
	plan: DatesPlan | undefined,
	language: string
): string | undefined => {
	const newWeeks = plan?.weeks.filter((week) => week.newFrom !== null) ?? [];
	const firstNewDay = newWeeks[0]?.newFrom;
	const lastNewDay = newWeeks[newWeeks.length - 1]?.newTo;
	if (!firstNewDay || !lastNewDay) return undefined;
	return formatPeriod({ start: firstNewDay, end: lastNewDay }, language);
};

/** The Generate panel's line for a dates run: its new days, from the first to the last; empty without a plan. */
export const datesRunHint = (
	plan: DatesPlan | undefined,
	language: string,
	t: TFunction
): string => {
	const range = datesRunRange(plan, language);
	if (!plan || range === undefined) return "";
	return t("scheduling.dates.generate.hint", { count: plan.newDays, range });
};

/** What the Generate step says: the line of what it works out, the days it names in place of the month, and what it asks about before replacing. */
export type GenerateStepWords = {
	hint: string;
	days: string | undefined;
	/** The rosters to review a dates run replaces (`replacedDaysOf`); undefined when it replaces none, and for a month run. */
	replaces: ReplacedDays | undefined;
};

/**
 * The Generate step's words: a dates run names its days in the title and
 * button, says how many it generates and what it replaces; a month run keeps
 * its month's name (days undefined), names the ticked weeks and replaces
 * nothing it must ask about.
 */
export const generateStepWordsOf = (
	byDates: boolean,
	plan: DatesPlan | undefined,
	ticked: ReadonlyArray<string>,
	language: string,
	t: TFunction
): GenerateStepWords =>
	byDates
		? {
				hint: datesRunHint(plan, language, t),
				days: datesRunRange(plan, language),
				replaces: plan ? replacedDaysOf(plan) : undefined,
			}
		: {
				hint: tickedWeeksHint(ticked, language, t),
				days: undefined,
				replaces: undefined,
			};
