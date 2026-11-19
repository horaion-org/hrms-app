import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import { mondayOf } from "@/common/weeks";
import type {
	ScheduleMonthSummary,
	WeekState,
	WeekSummary,
} from "@/features/scheduling/months/api";

/*
 * The Scheduling landing's one card per Department, pure: the month
 * summaries the landing already loads and today's date in, card entries out.
 */

/** How many days the card's strip shows, from today. */
export const DAY_STRIP_LENGTH = 21;

/** Days in a week, for a week read from an older API that sends no parts. */
const DAYS_IN_WEEK = 7;

/** A day's mark on the card's strip. */
export type DayMark = "published" | "toReview" | "none";

/**
 * How far the card says the Department is published: up to a day from this
 * week's Monday, not from this week though a schedule is published later or
 * earlier in the loaded months, or nothing published at all.
 */
export type PublishedStanding = "upTo" | "notFromThisWeek" | "nothing";

/** A Department the manager can see, as the landing's Filters offer it. */
export type CardDepartment = { departmentId: string; name: string };

/** A run of consecutive days, both included. */
export type CardDayRun = { from: string; to: string };

/** What one Department's card shows; a day is an ISO date, undefined when there is none. */
export type DepartmentCardEntry = {
	departmentId: string;
	departmentName: string;
	/** The last day of the published run from the Monday of today's week. */
	publishedUpTo: string | undefined;
	publishedStanding: PublishedStanding;
	/** How many days are to review from this week's Monday on; earlier ones are left out. */
	toReviewDays: number;
	/** The first run of days to review from this week's Monday on: what waits to be published. */
	waitingDays: CardDayRun | undefined;
	/** The last day any schedule covers. */
	scheduledUpTo: string | undefined;
	/** The first day to review, where the card's "to review" line opens the timeline. */
	firstToReviewDay: string | undefined;
	dayStrip: Array<{ day: string; mark: DayMark }>;
};

/** One schedule of a Department, by the days it covers. */
type CoveredSchedule = {
	scheduleId: string;
	firstDay: string;
	lastDay: string;
	state: WeekState;
	redoing: boolean;
};

/** The day `by` days after `day`. */
const addDays = (day: string, by: number): string =>
	dayjs(day).add(by, "day").format(ISO_DATE_FORMAT);

/** A week's schedules: its parts, or the whole week for an older API that sends none. */
const schedulesOfWeek = (week: WeekSummary): Array<CoveredSchedule> => {
	if (week.parts && week.parts.length > 0)
		return week.parts.map((part) => ({
			scheduleId: part.scheduleId,
			firstDay: part.coveredFrom,
			lastDay: part.coveredTo,
			state: part.state,
			redoing: part.redoing,
		}));
	if (!week.scheduleId || week.state === "NOT_GENERATED") return [];
	return [
		{
			scheduleId: week.scheduleId,
			firstDay: week.periodStart,
			lastDay: addDays(week.periodStart, DAYS_IN_WEEK - 1),
			state: week.state,
			redoing: false,
		},
	];
};

/** A Department's schedules across its month summaries, in day order. */
const schedulesOfDepartment = (
	summaries: ReadonlyArray<ScheduleMonthSummary>,
	departmentId: string
): Array<CoveredSchedule> =>
	summaries
		.filter((summary) => summary.departmentId === departmentId)
		.flatMap((summary) => summary.weeks.flatMap(schedulesOfWeek))
		.sort((first, second) => first.firstDay.localeCompare(second.firstDay));

/** The state of the schedule that holds a day; a redo part gives way to the part keeping the day. */
const stateOfDay = (
	schedules: ReadonlyArray<CoveredSchedule>,
	day: string
): WeekState | undefined => {
	const covering = schedules.filter(
		(schedule) => schedule.firstDay <= day && day <= schedule.lastDay
	);
	return (covering.find((schedule) => !schedule.redoing) ?? covering[0])?.state;
};

/** A day's mark: published, to review, or none for every other state and no schedule. */
export const dayMarkOf = (state: WeekState | undefined): DayMark => {
	if (state === "PUBLISHED") return "published";
	if (state === "TO_REVIEW") return "toReview";
	return "none";
};

/** The last day of the run of published days from `firstDay`; undefined when `firstDay` is not published. */
const publishedRunEnd = (
	schedules: ReadonlyArray<CoveredSchedule>,
	firstDay: string
): string | undefined => {
	let lastPublished: string | undefined;
	for (
		let day = firstDay;
		stateOfDay(schedules, day) === "PUBLISHED";
		day = addDays(day, 1)
	)
		lastPublished = day;
	return lastPublished;
};

/** The days to review from `firstDay` to `lastDay`, in day order; none when `lastDay` is undefined. */
const toReviewDaysBetween = (
	schedules: ReadonlyArray<CoveredSchedule>,
	firstDay: string,
	lastDay: string | undefined
): Array<string> => {
	const days: Array<string> = [];
	if (lastDay === undefined) return days;
	for (let day = firstDay; day <= lastDay; day = addDays(day, 1))
		if (dayMarkOf(stateOfDay(schedules, day)) === "toReview") days.push(day);
	return days;
};

/** The first run of consecutive days among `days`, which are in day order; undefined when there is none. */
export const firstRunOf = (
	days: ReadonlyArray<string>
): CardDayRun | undefined => {
	const from = days[0];
	if (from === undefined) return undefined;
	let to = from;
	for (const day of days.slice(1)) {
		if (day !== addDays(to, 1)) break;
		to = day;
	}
	return { from, to };
};

/** Which published line the card shows, from the run from this week and whether any schedule is published. */
export const publishedStandingOf = (
	publishedUpTo: string | undefined,
	anyPublished: boolean
): PublishedStanding => {
	if (publishedUpTo !== undefined) return "upTo";
	return anyPublished ? "notFromThisWeek" : "nothing";
};

/** How many days a run holds. */
export const dayCountOfRun = (run: CardDayRun): number =>
	dayjs(run.to).diff(dayjs(run.from), "day") + 1;

/** Whether a card day shows its year: only when it is not today's year. */
export const showsYear = (day: string, today: string): boolean =>
	dayjs(day).year() !== dayjs(today).year();

/** One Department's card from its schedules and today's date. */
const cardOf = (
	department: CardDepartment,
	schedules: ReadonlyArray<CoveredSchedule>,
	today: string
): DepartmentCardEntry => {
	// Only days from this week on: the timeline the card opens shows no earlier week.
	const thisMonday = mondayOf(today);
	const lastDays = schedules.map((schedule) => schedule.lastDay).sort();
	const scheduledUpTo = lastDays[lastDays.length - 1];
	const toReview = toReviewDaysBetween(schedules, thisMonday, scheduledUpTo);
	const waitingDays = firstRunOf(toReview);
	const publishedUpTo = publishedRunEnd(schedules, thisMonday);
	const anyPublished = schedules.some(
		(schedule) => schedule.state === "PUBLISHED"
	);
	return {
		departmentId: department.departmentId,
		departmentName: department.name,
		publishedUpTo,
		publishedStanding: publishedStandingOf(publishedUpTo, anyPublished),
		toReviewDays: toReview.length,
		waitingDays,
		scheduledUpTo,
		firstToReviewDay: waitingDays?.from,
		dayStrip: Array.from({ length: DAY_STRIP_LENGTH }, (_, index) => {
			const day = addDays(today, index);
			return { day, mark: dayMarkOf(stateOfDay(schedules, day)) };
		}),
	};
};

/**
 * One card per Department the manager can see, in the order given, from the
 * month summaries the landing loads (this week's month onwards) and today
 * as an ISO date.
 */
export const departmentCards = (
	departments: ReadonlyArray<CardDepartment>,
	summaries: ReadonlyArray<ScheduleMonthSummary>,
	today: string
): Array<DepartmentCardEntry> =>
	departments.map((department) =>
		cardOf(
			department,
			schedulesOfDepartment(summaries, department.departmentId),
			today
		)
	);
