import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import type { WeekState } from "@/features/scheduling/months/api";

/*
 * One Department's timeline, pure. Dates are ISO strings ("YYYY-MM-DD"); the
 * window is the days shown, from its first day for the view's length.
 */

/** How many weeks the timeline shows at once. */
export type TimelineView = "week" | "two" | "four";

/** The days each view shows. */
export const DAYS_IN_VIEW: Record<TimelineView, number> = {
	week: 7,
	two: 14,
	four: 28,
};

/** One schedule on the timeline, by the days it covers and its state as the month read gives it. */
export type TimelineSchedule = {
	id: string;
	name: string;
	firstDay: string;
	lastDay: string;
	status: WeekState;
};

/** A run of days, both ends included. */
export type DayRun = { firstDay: string; lastDay: string };

/** Above this many schedules to review, the needs list names them in one line. */
const MOST_REVIEW_LINES = 2;

const addDays = (day: string, count: number): string =>
	dayjs(day).add(count, "day").format(ISO_DATE_FORMAT);

/** Whether the schedule covers any day from `firstDay` to `lastDay`. */
const touches = (
	schedule: TimelineSchedule,
	firstDay: string,
	lastDay: string
): boolean => schedule.firstDay <= lastDay && schedule.lastDay >= firstDay;

/** The ISO dates the window shows, from `firstDay` for the view's length. */
export const windowDays = (
	firstDay: string,
	view: TimelineView
): Array<string> =>
	Array.from({ length: DAYS_IN_VIEW[view] }, (_, offset) =>
		addDays(firstDay, offset)
	);

/** The first day of the window one view's length later (`step` 1) or earlier (`step` -1). */
export const shiftWindow = (
	firstDay: string,
	view: TimelineView,
	step: 1 | -1
): string => addDays(firstDay, step * DAYS_IN_VIEW[view]);

/**
 * The schedules touching the window, by first day, packed into lanes: a
 * schedule joins the first lane whose last schedule ends before it starts.
 */
export const lanesOf = (
	schedules: ReadonlyArray<TimelineSchedule>,
	firstDay: string,
	lastDay: string
): Array<Array<TimelineSchedule>> => {
	const lanes: Array<Array<TimelineSchedule>> = [];
	const shown = schedules
		.filter((schedule) => touches(schedule, firstDay, lastDay))
		.sort((left, right) => left.firstDay.localeCompare(right.firstDay));
	for (const schedule of shown) {
		const freeLane = lanes.find(
			(lane) => lane[lane.length - 1]!.lastDay < schedule.firstDay
		);
		if (freeLane) freeLane.push(schedule);
		else lanes.push([schedule]);
	}
	return lanes;
};

/** The schedule covering `day`, or undefined when none does. */
export const scheduleOfDay = (
	schedules: ReadonlyArray<TimelineSchedule>,
	day: string
): TimelineSchedule | undefined =>
	schedules.find((schedule) => touches(schedule, day, day));

/** The runs of days from `firstDay` to `lastDay` that no schedule covers. */
export const daysWithoutSchedule = (
	schedules: ReadonlyArray<TimelineSchedule>,
	firstDay: string,
	lastDay: string
): Array<DayRun> => {
	const runs: Array<DayRun> = [];
	for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
		if (scheduleOfDay(schedules, day)) continue;
		const lastRun = runs[runs.length - 1];
		if (lastRun && lastRun.lastDay === addDays(day, -1)) lastRun.lastDay = day;
		else runs.push({ firstDay: day, lastDay: day });
	}
	return runs;
};

/** One line of the "needs you" list, as data. */
export type NeedLine =
	| { kind: "reviewOne"; scheduleId: string; name: string }
	| { kind: "reviewMany"; count: number; names: Array<string> }
	| ({ kind: "noSchedule" } & DayRun);

/**
 * What needs the manager in the window: the schedules to review (one line
 * each, or one line for all above two), then the runs of days from today on
 * that no schedule covers.
 */
export const needsOf = (
	schedules: ReadonlyArray<TimelineSchedule>,
	window: DayRun,
	today: string
): Array<NeedLine> => {
	const toReview = schedules.filter(
		(schedule) =>
			schedule.status === "TO_REVIEW" &&
			touches(schedule, window.firstDay, window.lastDay)
	);
	const reviewLines: Array<NeedLine> =
		toReview.length > MOST_REVIEW_LINES
			? [
					{
						kind: "reviewMany",
						count: toReview.length,
						names: toReview.map((schedule) => schedule.name),
					},
				]
			: toReview.map((schedule) => ({
					kind: "reviewOne",
					scheduleId: schedule.id,
					name: schedule.name,
				}));
	const firstOpenDay = today > window.firstDay ? today : window.firstDay;
	const gapLines: Array<NeedLine> = daysWithoutSchedule(
		schedules,
		firstOpenDay,
		window.lastDay
	).map((run) => ({ kind: "noSchedule", ...run }));
	return [...reviewLines, ...gapLines];
};
