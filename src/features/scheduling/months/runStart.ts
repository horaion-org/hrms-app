import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import type {
	DatesPlan,
	DatesPlanWeek,
	DayRun,
	PartDays,
} from "@/features/scheduling/dates/api";
import { daysBeforeOf } from "@/features/scheduling/dates/datesSetup";
import type { PeopleProblem } from "@/features/scheduling/dates/people";
import type {
	MonthWeek,
	ScheduleMonth,
} from "@/features/scheduling/months/api";

/*
 * Where the month wizard's run starts, pure: its first generated day, the
 * days before it that "Before this week" asks about, and the week before,
 * whose roster may carry over. Dates are ISO strings ("YYYY-MM-DD"). The API
 * decides what a run generates; this only reads the month and the dates plan.
 */

/** What the month wizard knows when it works out where a run starts. */
export type RunStartFacts = {
	/** Whether Setup schedules for chosen dates rather than ticked weeks. */
	byDates: boolean;
	/** The dates' plan, once the chosen dates are valid and it has been read. */
	plan: DatesPlan | undefined;
	/** The first ticked week without a roster, where everyone starts (`startingWeekOf`). */
	startingWeek: MonthWeek | undefined;
	/** The branch's today. */
	branchToday: string;
};

/** Where a run starts, and what "Before this week" reads around it. */
export type RunStart = {
	/** The dates plan's first week with new days: where everyone starts, and whose earlier days are asked about. */
	datesStart: DatesPlanWeek | undefined;
	/** A started week's today: a week that has begun is generated from today (owner, API ADR-0115). */
	startedWeekFrom: string | undefined;
	/** The first day the run generates: a dates run's first new day, a started week's today, or the week's Monday. */
	firstGeneratedDay: string | undefined;
	/**
	 * The first week's days before its first generated day, which "Before this
	 * week" names while nobody knows them (owner answer 2); dates name them in their plan.
	 */
	daysBeforeStart: DayRun | undefined;
	/** The Monday of the week the run starts in. */
	firstMonday: string | undefined;
	/** The Monday of the week before it, whose roster may carry over. */
	weekBefore: string | undefined;
	/** Whether a dates run's first new day is a Monday: the plan names no days before it, so the week before is read. */
	datesStartOnMonday: boolean;
	/** Whether the dates' first new days already have a schedule, which the run redoes (API ADR-0129). */
	datesRedoStart: boolean;
};

/** A started week's today, or none for a week that has not begun. */
const startedWeekFromOf = (
	startingWeek: MonthWeek | undefined,
	branchToday: string
): string | undefined =>
	startingWeek && startingWeek.periodStart < branchToday
		? branchToday
		: undefined;

/** A month run's days before its first generated day: only a started week has any. */
const monthDaysBeforeStart = (
	startingWeek: MonthWeek | undefined,
	startedWeekFrom: string | undefined
): DayRun | undefined =>
	startingWeek && startedWeekFrom
		? daysBeforeOf(startingWeek.periodStart, startedWeekFrom)
		: undefined;

/** Where a month or dates run starts, from the month's starting week or the dates' plan. */
export const runStartOf = ({
	byDates,
	plan,
	startingWeek,
	branchToday,
}: RunStartFacts): RunStart => {
	const datesStart = plan?.weeks.find((week) => week.newFrom !== null);
	const startedWeekFrom = startedWeekFromOf(startingWeek, branchToday);
	const firstMonday = byDates
		? datesStart?.periodStart
		: startingWeek?.periodStart;
	return {
		datesStart,
		startedWeekFrom,
		firstGeneratedDay: byDates
			? (datesStart?.newFrom ?? undefined)
			: (startedWeekFrom ?? startingWeek?.periodStart),
		daysBeforeStart: byDates
			? (plan?.notRosteredBefore ?? undefined)
			: monthDaysBeforeStart(startingWeek, startedWeekFrom),
		firstMonday,
		weekBefore:
			firstMonday &&
			dayjs(firstMonday).subtract(1, "week").format(ISO_DATE_FORMAT),
		datesStartOnMonday:
			datesStart !== undefined && datesStart.newFrom === datesStart.periodStart,
		datesRedoStart: (datesStart?.redone.length ?? 0) > 0,
	};
};

/**
 * The parts "Before this week" looks in for a roster over the day before the
 * first generated day: a dates run's first week's kept parts first (cut to
 * the days that stay, they name what carries over when the dates redo a wider
 * part), then every part of the month before and of the month.
 */
export const partsBeforeStartOf = (
	datesStart: Pick<DatesPlanWeek, "kept"> | undefined,
	monthBefore: ScheduleMonth | undefined,
	month: ScheduleMonth | undefined
): Array<PartDays> => [
	...(datesStart?.kept ?? []),
	...[...(monthBefore?.weeks ?? []), ...(month?.weeks ?? [])].flatMap(
		(week) => week.parts
	),
];

/** What decides whether "Before this week" may save a dates run's first days as a draft. */
export type DaysBeforeFacts = {
	/** The run's first new days redo days that have a schedule: no draft can be saved over them. */
	redoAtStart: boolean;
	mayCreate: boolean;
	mayUpdate: boolean;
	/** The Department's shifts and constraints are read, so the draft gets its choice. */
	listsRead: boolean;
	/** Why the chosen people can't be sent, e.g. nobody of the new days chosen; never sent as an empty list. */
	peopleProblem: PeopleProblem | undefined;
};

/** Whether "Before this week" may save the dates run's first days as a draft. */
export const mayAddDaysBeforeOf = (facts: DaysBeforeFacts): boolean =>
	!facts.redoAtStart &&
	facts.mayCreate &&
	facts.mayUpdate &&
	facts.listsRead &&
	facts.peopleProblem === undefined;
