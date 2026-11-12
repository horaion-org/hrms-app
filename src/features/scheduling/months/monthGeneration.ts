import type {
	GenerateMonthBody,
	MonthGeneration,
	MonthWeek,
	ScheduleMonth,
} from "@/features/scheduling/months/api";
import type { WeekChoiceIds } from "@/features/scheduling/weekChoice";

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

/** Each new week's choice of shifts and constraints, by Monday. */
export type MonthChoices = Record<string, WeekChoiceIds>;

/** The setup of the weeks a run creates. */
export type MonthSetup = { includeLeave: boolean; allowOpenShifts: boolean };

/** A new week's setup, as the week wizard starts a new draft (`pages/CreateSchedule.tsx`, `setupDefaults`). */
export const MONTH_SETUP_DEFAULTS: MonthSetup = {
	includeLeave: true,
	allowOpenShifts: false,
};

/**
 * What generating the month sends: the setup, and a choice for every week the
 * run creates, the given one or else `everything`. A week without either is
 * left out, and the API refuses the run with MONTH_WEEK_CHOICE_MISSING.
 */
export const generateMonthBody = (
	month: ScheduleMonth,
	choices: MonthChoices,
	everything: WeekChoiceIds | undefined,
	setup: MonthSetup
): GenerateMonthBody => ({
	...setup,
	newWeeks: weeksToCreate(month).flatMap((week) => {
		const choice = choices[week.periodStart] ?? everything;
		return choice
			? [
					{
						periodStart: week.periodStart,
						includedShiftIds: choice.shiftIds,
						includedConstraintIds: choice.constraintIds,
					},
				]
			: [];
	}),
});
