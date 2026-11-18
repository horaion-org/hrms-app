import dayjs from "dayjs";
import type { ScheduleMonth, WeekPart } from "@/features/scheduling/months/api";
import { monthOf } from "@/features/scheduling/months/monthWeeks";
import {
	hoursInDays,
	type RosterCell,
	type RosterRow,
} from "@/features/scheduling/roster/roster";
import type { Schedule } from "@/features/scheduling/schedules/api";
import type { TimelineSchedule } from "@/features/scheduling/timeline/timeline";

/*
 * What the timeline reads, merged without I/O: the schedules of the months
 * read, and one row per person across every schedule's roster.
 */

/** The month format the month read takes, e.g. "2026-11". */
const MONTH_FORMAT = "YYYY-MM";

/** One person's day on the timeline: their cell and the schedule it belongs to. */
export type TimelineCell = { cell: RosterCell; scheduleId: string };

/** One person across every schedule shown. */
export type TimelineRow = {
	key: string;
	name: string | null;
	jobTitle: string | null;
	employeeCode: string | null;
	/** Each day a schedule gives the person, by ISO date. */
	days: Record<string, TimelineCell>;
};

/** One schedule's roster rows, as `rosterFromAssignments` builds them. */
export type ScheduleRoster = { scheduleId: string; rows: Array<RosterRow> };

/** The months ("yyyy-MM") from `firstDay` to `lastDay`, so a window over two months reads both. */
export const monthsOfWindow = (
	firstDay: string,
	lastDay: string
): Array<string> => {
	const months: Array<string> = [];
	for (
		let month = dayjs(firstDay).startOf("month");
		!month.isAfter(lastDay, "day");
		month = month.add(1, "month")
	)
		months.push(month.format(MONTH_FORMAT));
	return months;
};

/**
 * The schedules of the months read, once each: a schedule seen in two weeks
 * or months spans from its earliest covered day to its latest.
 */
export const timelineSchedulesOf = (
	months: ReadonlyArray<ScheduleMonth>
): Array<TimelineSchedule> => {
	const schedules = new Map<string, TimelineSchedule>();
	for (const part of months.flatMap((month) =>
		month.weeks.flatMap((week) => week.parts)
	)) {
		const seen = schedules.get(part.scheduleId);
		schedules.set(part.scheduleId, {
			id: part.scheduleId,
			name: part.name,
			status: part.state,
			publishedOnce:
				seen?.publishedOnce === true || part.publishedOnce === true,
			firstDay:
				seen && seen.firstDay < part.coveredFrom
					? seen.firstDay
					: part.coveredFrom,
			lastDay:
				seen && seen.lastDay > part.coveredTo ? seen.lastDay : part.coveredTo,
		});
	}
	return [...schedules.values()];
};

/** Every schedule's roster rows merged into one row per person, each cell naming its schedule. */
export const timelineRowsOf = (
	rosters: ReadonlyArray<ScheduleRoster>
): Array<TimelineRow> => {
	const rows = new Map<string, TimelineRow>();
	for (const { scheduleId, rows: rosterRows } of rosters)
		for (const rosterRow of rosterRows) {
			const row = rows.get(rosterRow.key) ?? {
				key: rosterRow.key,
				name: rosterRow.name,
				jobTitle: rosterRow.jobTitle,
				employeeCode: rosterRow.employeeCode,
				days: {},
			};
			for (const [day, cell] of Object.entries(rosterRow.days))
				row.days[day] = { cell, scheduleId };
			rows.set(row.key, row);
		}
	return [...rows.values()];
};

/** The paid hours a person's row adds up to over `days`, totalled as the roster page totals them. */
export const hoursOfRow = (
	row: TimelineRow,
	days: ReadonlyArray<string>
): number =>
	hoursInDays(
		{
			key: row.key,
			membershipId: null,
			name: row.name,
			jobTitle: row.jobTitle,
			employeeCode: row.employeeCode,
			days: Object.fromEntries(
				Object.entries(row.days).map(([day, { cell }]) => [day, cell])
			),
		},
		days
	);

/** Where one schedule's reads stand: its schedule read, then its roster read when it has a roster. */
export type RosterReadStep = "pending" | "failed" | "done";

/** Whether the grid's rows are all read, still loading, or missing a roster that could not be read. */
export type RostersRead = "loading" | "failed" | "loaded";

/** The rosters' state from each schedule's reads: one failure fails them, else one still pending keeps them loading. */
export const rostersReadOf = (
	steps: ReadonlyArray<RosterReadStep>
): RostersRead => {
	if (steps.includes("failed")) return "failed";
	if (steps.includes("pending")) return "loading";
	return "loaded";
};

/** The parts of the week starting `periodStart`, as the roster page gives the delete dialog; none when not read. */
export const weekPartsOf = (
	months: ReadonlyArray<ScheduleMonth>,
	periodStart: string
): Array<WeekPart> =>
	months
		.flatMap((month) => month.weeks)
		.find((week) => week.periodStart === periodStart)?.parts ?? [];

/** One schedule read, with what its actions need: its week's parts and the month its week belongs to, once read. */
export type TimelinePiece = {
	schedule: Schedule;
	weekParts: Array<WeekPart>;
	month: ScheduleMonth | undefined;
};

/** Every schedule read as a piece of the roster, by schedule id, from the months already read. */
export const timelinePiecesOf = (
	schedules: ReadonlyArray<Schedule>,
	months: ReadonlyArray<ScheduleMonth>
): Record<string, TimelinePiece> =>
	Object.fromEntries(
		schedules.map((schedule) => [
			schedule.scheduleId,
			{
				schedule,
				weekParts: weekPartsOf(months, schedule.periodStart),
				month: months.find(
					(month) => month.month === monthOf(schedule.periodStart)
				),
			},
		])
	);
