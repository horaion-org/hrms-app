import type {
	MonthGeneration,
	MonthWeek,
	ScheduleMonth,
} from "@/features/scheduling/months/api";

/*
 * What generating a month means on the page, from the month read alone. The
 * API decides which weeks a run covers (`includedInMonthGeneration`); these
 * helpers only read it, so the rule lives in one place.
 */

/** Whether any week of the month is being generated. */
export const isGenerating = (month: ScheduleMonth): boolean =>
	month.weeks.some((week) => week.state === "GENERATING");

/** The weeks a run would cover. */
export const coveredWeeks = (month: ScheduleMonth): Array<MonthWeek> =>
	month.weeks.filter((week) => week.includedInMonthGeneration === true);

/** The covered weeks without a schedule: a run creates them, so it needs a choice for each. */
export const weeksToCreate = (month: ScheduleMonth): Array<MonthWeek> =>
	coveredWeeks(month).filter((week) => week.state === "NOT_GENERATED");

/**
 * Whether "Before you generate" shows: nothing is generating and a covered
 * week has no roster yet (not generated, or a draft).
 */
export const showsBeforeGenerate = (month: ScheduleMonth): boolean =>
	!isGenerating(month) &&
	coveredWeeks(month).some(
		(week) => week.state === "NOT_GENERATED" || week.state === "DRAFT"
	);

/** The covered weeks changed by hand: generating the month replaces those changes. */
export const handChangedCoveredWeeks = (
	month: ScheduleMonth
): Array<MonthWeek> =>
	coveredWeeks(month).filter((week) => (week.handChangedDays ?? 0) > 0);

/** The weeks a run refused, by Monday, with the API's error code. */
export const refusedWeeks = (answer: MonthGeneration): Record<string, string> =>
	Object.fromEntries(
		answer.weeks.flatMap((week) =>
			week.outcome === "REFUSED" && week.reason !== null
				? [[week.periodStart, week.reason]]
				: []
		)
	);
