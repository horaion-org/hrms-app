import type {
	GenerateMonthBody,
	MonthGeneration,
	MonthWeek,
	ScheduleMonth,
	WeekState,
} from "@/features/scheduling/months/api";
import type { DatesPlanWeek } from "@/features/scheduling/dates/api";
import { periodStartingOn } from "@/features/scheduling/periods";
import type { ScheduleBody } from "@/features/scheduling/schedules/api";
import { EARLIER_WEEK_FAILED } from "@/features/scheduling/schedules/scheduleRefusal";
import { rosterPartBefore } from "@/features/scheduling/dates/datesSetup";
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

/** The Mondays of the covered weeks: what a run generates when the caller chooses no weeks. */
export const coveredMondaysOf = (month: ScheduleMonth): Array<string> =>
	coveredWeeks(month).map((week) => week.periodStart);

/**
 * The weeks a refused run sent that the month, read again, no longer covers:
 * published, being generated or over since the page read it.
 */
export const weeksNoLongerCovered = (
	sent: ReadonlyArray<string>,
	month: ScheduleMonth
): Array<MonthWeek> =>
	month.weeks.filter(
		(week) =>
			sent.includes(week.periodStart) && week.includedInMonthGeneration !== true
	);

/** The chosen covered weeks without a schedule: a run creates them, so it needs a choice for each. */
export const weeksToCreate = (
	month: ScheduleMonth,
	chosen: ReadonlyArray<string> = coveredMondaysOf(month)
): Array<MonthWeek> =>
	coveredWeeks(month).filter(
		(week) =>
			week.state === "NOT_GENERATED" && chosen.includes(week.periodStart)
	);

/**
 * Whether "Before you generate" shows: nothing is generating and a covered
 * week has no roster yet (not generated, or a draft).
 */
export const showsBeforeGenerate = (month: ScheduleMonth): boolean =>
	!isGenerating(month) &&
	coveredWeeks(month).some(
		(week) => week.state === "NOT_GENERATED" || week.state === "DRAFT"
	);

/**
 * Whether "Regenerate" shows: nothing is generating, "Before you generate"
 * doesn't show, and a run would work some week out again (one not
 * published). The month's counterpart of a week's `regenerable`.
 */
export const showsRegenerate = (month: ScheduleMonth): boolean =>
	!isGenerating(month) &&
	!showsBeforeGenerate(month) &&
	coveredWeeks(month).length > 0;

/** The chosen covered weeks changed by hand (every covered week by default): generating them replaces those changes. */
export const handChangedCoveredWeeks = (
	month: ScheduleMonth,
	chosen: ReadonlyArray<string> = coveredMondaysOf(month)
): Array<MonthWeek> =>
	coveredWeeks(month).filter(
		(week) =>
			(week.handChangedDays ?? 0) > 0 && chosen.includes(week.periodStart)
	);

/** The weeks a run refused, by Monday, with the API's error code. */
export const refusedWeeks = (
	answer: Pick<MonthGeneration, "weeks">
): Record<string, string> =>
	Object.fromEntries(
		answer.weeks.flatMap((week) =>
			week.outcome === "REFUSED" && week.reason !== null
				? [[week.periodStart, week.reason]]
				: []
		)
	);

/** The weeks a month run took out of its queue because an earlier week failed, Monday order. */
export const stoppedWeeksOf = (month: ScheduleMonth): Array<MonthWeek> =>
	month.weeks.filter((week) => week.queueRefusal?.code === EARLIER_WEEK_FAILED);

/**
 * Whether a week's newest run failed: a failed week, or a week whose
 * regeneration failed and kept its earlier roster (it carries `failure`).
 */
const newestRunFailed = (week: MonthWeek): boolean =>
	week.state === "FAILED" || week.failure != null;

/**
 * The failed week that stopped the month's stopped weeks: the last week before
 * the first of them whose newest run failed. None when no week is stopped, or
 * the failed week is not in this month.
 */
export const failedWeekOf = (month: ScheduleMonth): MonthWeek | undefined => {
	const [firstStopped] = stoppedWeeksOf(month);
	if (!firstStopped) return undefined;
	const failedBefore = month.weeks.filter(
		(week) =>
			newestRunFailed(week) && week.periodStart < firstStopped.periodStart
	);
	return failedBefore[failedBefore.length - 1];
};

/**
 * What "Try again" generates (owner: "yes then ask the user to attempt
 * again"): the failed week's Monday and every Monday its failure stopped,
 * Monday order. Empty when the month has no failed week with stopped weeks
 * after it.
 */
export const retryWeeksOf = (month: ScheduleMonth): Array<string> => {
	const failed = failedWeekOf(month);
	if (!failed) return [];
	return [
		failed.periodStart,
		...stoppedWeeksOf(month).map((week) => week.periodStart),
	];
};

/** Each new week's choice of shifts and constraints, by Monday. */
export type MonthChoices = Record<string, WeekChoiceIds>;

/** The setup of the weeks a run creates. */
export type MonthSetup = { includeLeave: boolean };

/** A new week's setup, as the week wizard starts a new draft (`pages/CreateSchedule.tsx`, `setupDefaults`). */
export const MONTH_SETUP_DEFAULTS: MonthSetup = {
	includeLeave: true,
};

/**
 * What generating the month sends: the setup, the chosen Mondays (every
 * covered week by default), and a choice for every chosen week the run
 * creates, the given one or else `everything`. A week without either is left
 * out, and the API refuses the run with MONTH_WEEK_CHOICE_MISSING.
 */
export const generateMonthBody = (
	month: ScheduleMonth,
	choices: MonthChoices,
	everything: WeekChoiceIds | undefined,
	setup: MonthSetup,
	chosen: ReadonlyArray<string> = coveredMondaysOf(month)
): GenerateMonthBody => ({
	...setup,
	weeks: [...chosen].sort(),
	newWeeks: weeksToCreate(month, chosen).flatMap((week) => {
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

/** Whether a week has no roster yet: not generated, or a draft. */
const hasNoRosterYet = (week: MonthWeek): boolean =>
	week.state === "NOT_GENERATED" || week.state === "DRAFT";

/** The chosen covered weeks, Monday order. */
const chosenWeeksOf = (
	month: ScheduleMonth,
	chosen: ReadonlyArray<string>
): Array<MonthWeek> =>
	coveredWeeks(month).filter((week) => chosen.includes(week.periodStart));

/**
 * The week where everyone's starting point is set before a run: the first
 * chosen covered week, while it has no roster yet (not generated, or a
 * draft); none when it has one or nothing is chosen.
 */
export const startingWeekOf = (
	month: ScheduleMonth,
	chosen: ReadonlyArray<string> = coveredMondaysOf(month)
): MonthWeek | undefined => {
	const [first] = chosenWeeksOf(month, chosen);
	return first && hasNoRosterYet(first) ? first : undefined;
};

/**
 * States whose week has a roster before the next week runs. GENERATING counts:
 * the API queues the next week until no week of the Department is generating.
 */
const STATES_WITH_A_ROSTER: ReadonlyArray<WeekState> = [
	"PUBLISHED",
	"TO_REVIEW",
	"GENERATING",
];

/** Whether a week has, or will have, a roster before the next week runs. */
export const rosterCarriesOver = (state: WeekState): boolean =>
	STATES_WITH_A_ROSTER.includes(state);

/**
 * Whether the week before the month's week at `index` carries into it: it is
 * chosen in this run (it has a roster by then), being generated (the API
 * queues the next week behind it), or a roster covers the day before the week.
 */
const weekBeforeCarriesOver = (
	month: ScheduleMonth,
	index: number,
	chosen: ReadonlyArray<string>
): boolean => {
	const before = month.weeks[index - 1];
	const week = month.weeks[index];
	if (before === undefined || week === undefined) return false;
	return (
		chosen.includes(before.periodStart) ||
		before.state === "GENERATING" ||
		rosterPartBefore(week.periodStart, before.parts) !== undefined
	);
};

/**
 * Every chosen week with nothing before it to start from, Monday order: a
 * chosen week without a roster yet that is the first chosen week, or whose
 * week before is neither chosen nor has a roster (a gap). Each is asked for
 * the days before it.
 */
export const startingWeeksOf = (
	month: ScheduleMonth,
	chosen: ReadonlyArray<string>
): Array<MonthWeek> => {
	const [firstChosen] = chosenWeeksOf(month, chosen);
	return month.weeks.filter(
		(week, index) =>
			week.includedInMonthGeneration === true &&
			chosen.includes(week.periodStart) &&
			hasNoRosterYet(week) &&
			(week === firstChosen || !weekBeforeCarriesOver(month, index, chosen))
	);
};

/** The name of a week's draft the app saves: the same words the API names the weeks it creates with. */
export const weekNameOf = (monday: string): string => `Week of ${monday}`;

/**
 * What saving a month run's first week as a draft sends, to add its starting
 * point before the run: the week's name and its choice, with Setup's
 * settings. A week that has begun is generated from today (owner, API
 * ADR-0115), so its draft covers today to Sunday.
 */
export const startingWeekBody = (
	monday: string,
	branchToday: string,
	weekChoice: WeekChoiceIds,
	setup: MonthSetup
): ScheduleBody => ({
	name: weekNameOf(monday),
	periodStart: monday,
	...(monday < branchToday
		? { coveredFrom: branchToday, coveredTo: periodStartingOn(monday).end }
		: {}),
	includeLeave: setup.includeLeave,
	includedShiftIds: weekChoice.shiftIds,
	includedConstraintIds: weekChoice.constraintIds,
});

/**
 * What saving a dates run's first new part as a draft sends, covering its new
 * days, which the run then generates: the name Setup holds (else the week's
 * name), the part's choice and Setup's settings. None while the part has no
 * new days.
 */
export const datesStartBody = (
	datesStart: Pick<DatesPlanWeek, "periodStart" | "newFrom" | "newTo">,
	name: string,
	weekChoice: WeekChoiceIds,
	setup: MonthSetup
): ScheduleBody | undefined => {
	const { periodStart, newFrom, newTo } = datesStart;
	if (!newFrom || !newTo) return undefined;
	return {
		name: name.trim() || weekNameOf(periodStart),
		periodStart,
		coveredFrom: newFrom,
		coveredTo: newTo,
		includeLeave: setup.includeLeave,
		includedShiftIds: weekChoice.shiftIds,
		includedConstraintIds: weekChoice.constraintIds,
	};
};
