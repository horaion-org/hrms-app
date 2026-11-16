import type { TFunction } from "i18next";
import { formatDay } from "@/common/formatDay";
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

/*
 * The months' words that take the person's language, kept apart from the
 * pure dates and weeks of `monthWeeks.ts`, as readiness keeps its copy in
 * `readinessCopy.ts`.
 */

/** The order the summary line names the states in. */
const COUNTED_STATES: ReadonlyArray<Exclude<WeekState, "NOT_GENERATED">> = [
	"PUBLISHED",
	"TO_REVIEW",
	"TENTATIVE",
	"GENERATING",
	"FAILED",
	"REJECTED",
	"DRAFT",
	"UNKNOWN",
];

/** The month's weeks counted by state as one line, e.g. "2 published · 1 to review · 2 tentative". */
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
