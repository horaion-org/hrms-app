import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import { mondayOf } from "@/common/weeks";
import type { WeekState } from "@/features/scheduling/months/api";
import { lastPublishedPartStartOf } from "@/features/scheduling/schedules/partLines";
import {
	daysOfRun,
	stripRunsOf,
} from "@/features/scheduling/timeline/rosterStrip";
import {
	scheduleViewLink,
	type ScheduleViewLink,
} from "@/features/scheduling/schedules/scheduleViewLink";

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
	/** Published, then withdrawn: the API still counts it as published (API ADR-0129). */
	publishedOnce: boolean;
};

/** A run of days, both ends included. */
export type DayRun = { firstDay: string; lastDay: string };

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

/**
 * The `from` to put in the URL once the branch's today is known: the Monday of
 * its week when the URL names no `from` and the window opened on another
 * Monday (the device's, in another time zone); else none, nothing to change.
 */
export const branchWeekFrom = (
	from: string | undefined,
	shownFirstDay: string,
	branchToday: string
): string | undefined => {
	if (from !== undefined) return undefined;
	const branchMonday = mondayOf(branchToday);
	return branchMonday === shownFirstDay ? undefined : branchMonday;
};

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

/** One cell of a lane's row: a run of days without a bar, or a schedule's bar, each spanning its day columns. */
export type LaneCell =
	| { kind: "gap"; firstDay: string; span: number }
	| { kind: "bar"; schedule: TimelineSchedule; span: number };

/** A lane's cells across `days`, so each bar spans exactly the columns of its days in the window. */
export const laneCellsOf = (
	lane: ReadonlyArray<TimelineSchedule>,
	days: ReadonlyArray<string>
): Array<LaneCell> => {
	const cells: Array<LaneCell> = [];
	for (const day of days) {
		const schedule = scheduleOfDay(lane, day);
		const lastCell = cells[cells.length - 1];
		const continues =
			lastCell !== undefined &&
			(lastCell.kind === "bar"
				? lastCell.schedule.id === schedule?.id
				: schedule === undefined);
		if (lastCell && continues) lastCell.span += 1;
		else if (schedule) cells.push({ kind: "bar", schedule, span: 1 });
		else cells.push({ kind: "gap", firstDay: day, span: 1 });
	}
	return cells;
};

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

/**
 * The schedule shown alone: the one `schedule=` names when it is in the
 * window, else none, so a stale choice after moving the window dims nothing.
 */
export const shownScheduleIn = (
	schedules: ReadonlyArray<TimelineSchedule>,
	scheduleId: string | undefined
): string | undefined =>
	schedules.some((schedule) => schedule.id === scheduleId)
		? scheduleId
		: undefined;

/** Whether a schedule's bar and cells are dimmed: another schedule is shown alone. */
export const isDimmed = (
	scheduleId: string,
	shownScheduleId: string | undefined
): boolean => shownScheduleId !== undefined && shownScheduleId !== scheduleId;

/** States the "Not published yet" notice leaves out: published, or with no roster to publish. */
const NOT_AWAITING_PUBLICATION: ReadonlyArray<WeekState> = [
	"PUBLISHED",
	"FAILED",
	"REJECTED",
	"NOT_GENERATED",
];

/** The schedules still to be published from their own page, as the "Not published yet" notice names them. */
export const awaitingPublication = (
	schedules: ReadonlyArray<TimelineSchedule>
): Array<TimelineSchedule> =>
	schedules.filter(
		(schedule) => !NOT_AWAITING_PUBLICATION.includes(schedule.status)
	);

/** Where "Open schedule" leads: a draft to its setup, as the week card sends one; any other to its roster. */
export const timelineScheduleLink = (
	schedule: TimelineSchedule,
	departmentId: string
): ScheduleViewLink =>
	scheduleViewLink({
		scheduleId: schedule.id,
		departmentId,
		status: schedule.status === "DRAFT" ? "DRAFT" : "GENERATED",
	});

/** Whether any schedule covering a day from the run's first to its last is being generated. */
export const isGeneratingIn = (
	schedules: ReadonlyArray<TimelineSchedule>,
	run: DayRun
): boolean =>
	schedules.some(
		(schedule) =>
			schedule.status === "GENERATING" &&
			touches(schedule, run.firstDay, run.lastDay)
	);

/**
 * Whether the notice shown on arrival from a run by dates still shows: until
 * its days were seen being generated and no longer are. On arrival the month
 * read may not show the run yet, so nothing generating alone does not end it.
 */
export const generatingNoticeShown = (
	generatingNow: boolean,
	seenGenerating: boolean
): boolean => generatingNow || !seenGenerating;

/** One line of the "needs you" list, as data. */
export type NeedLine =
	| ({
			kind: "toReview";
			/** The schedules holding these days, in day order: what Publish publishes. */
			scheduleIds: Array<string>;
	  } & DayRun)
	| ({
			kind: "noSchedule";
			/** False for days before a published part of their week, which the API refuses to schedule. */
			schedulable: boolean;
	  } & DayRun);

/**
 * Whether `day` can be scheduled: not when a part of its week that counts as
 * published starts after it (`lastPublishedPartStartOf`, as the week card's
 * `weekGapsOf` decides).
 */
const isSchedulable = (
	schedules: ReadonlyArray<TimelineSchedule>,
	day: string
): boolean => {
	const monday = mondayOf(day);
	const lastPublishedPartStart = lastPublishedPartStartOf(
		schedules
			.filter((schedule) =>
				touches(schedule, monday, addDays(monday, DAYS_IN_VIEW.week - 1))
			)
			.map((schedule) => ({
				scheduleId: schedule.id,
				state: schedule.status,
				coveredFrom: schedule.firstDay,
				publishedOnce: schedule.publishedOnce,
			}))
	);
	return lastPublishedPartStart === undefined || day >= lastPublishedPartStart;
};

/** The runs of days from `firstDay` to `lastDay` no schedule covers, each split where it stops being schedulable. */
const gapLinesOf = (
	schedules: ReadonlyArray<TimelineSchedule>,
	firstDay: string,
	lastDay: string
): Array<NeedLine> => {
	const lines: Array<NeedLine & { kind: "noSchedule" }> = [];
	for (const run of daysWithoutSchedule(schedules, firstDay, lastDay))
		for (let day = run.firstDay; day <= run.lastDay; day = addDays(day, 1)) {
			const schedulable = isSchedulable(schedules, day);
			const last = lines[lines.length - 1];
			if (
				last &&
				last.schedulable === schedulable &&
				last.lastDay === addDays(day, -1)
			)
				last.lastDay = day;
			else
				lines.push({
					kind: "noSchedule",
					schedulable,
					firstDay: day,
					lastDay: day,
				});
		}
	return lines;
};

/**
 * What needs the manager in the window: each run of days to review, as the
 * status strip shows them, then the runs of days from today on that no
 * schedule covers, each saying whether the API lets them be scheduled.
 */
export const needsOf = (
	schedules: ReadonlyArray<TimelineSchedule>,
	window: DayRun,
	today: string
): Array<NeedLine> => {
	const reviewLines: Array<NeedLine> = stripRunsOf(schedules, daysOfRun(window))
		.filter((run) => run.state === "TO_REVIEW")
		.map((run) => ({
			kind: "toReview",
			firstDay: run.firstDay,
			lastDay: run.lastDay,
			scheduleIds: run.pieces.map((piece) => piece.schedule.id),
		}));
	const firstOpenDay = today > window.firstDay ? today : window.firstDay;
	const gapLines = gapLinesOf(schedules, firstOpenDay, window.lastDay);
	return [...reviewLines, ...gapLines];
};

/** The first run of days the needs list offers to generate, which the header's Generate opens with; none when no day is free. */
export const firstFreeRunOf = (
	lines: ReadonlyArray<NeedLine>
): DayRun | undefined => {
	const free = lines.find(
		(line) => line.kind === "noSchedule" && line.schedulable
	);
	return free && { firstDay: free.firstDay, lastDay: free.lastDay };
};
