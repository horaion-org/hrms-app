import type { TFunction } from "i18next";
import { formatDay } from "@/common/formatDay";
import type { DatesPlan } from "@/features/scheduling/dates/api";
import type {
	ScheduleMonth,
	WeekState,
} from "@/features/scheduling/months/api";
import { weeksNoLongerCovered } from "@/features/scheduling/months/monthGeneration";
import {
	formatMonthName,
	formatWeekDates,
	stateCounts,
} from "@/features/scheduling/months/monthWeeks";
import { tickedRangesOf } from "@/features/scheduling/months/weekTicks";
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
	const monthName = formatMonthName(month.month, language);
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

/** The Generate panel's line for a dates run: its new days, from the first to the last; empty without a plan. */
export const datesRunHint = (
	plan: DatesPlan | undefined,
	language: string,
	t: TFunction
): string => {
	const newWeeks = plan?.weeks.filter((week) => week.newFrom !== null) ?? [];
	const firstNewDay = newWeeks[0]?.newFrom;
	const lastNewDay = newWeeks[newWeeks.length - 1]?.newTo;
	if (!plan || !firstNewDay || !lastNewDay) return "";
	return t("scheduling.dates.generate.hint", {
		count: plan.newDays,
		range: formatPeriod({ start: firstNewDay, end: lastNewDay }, language),
	});
};
