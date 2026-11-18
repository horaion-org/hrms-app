import dayjs from "dayjs";
import type { ScheduleMonth } from "@/features/scheduling/months/api";
import {
	hoursInDays,
	type RosterCell,
	type RosterRow,
} from "@/features/scheduling/roster/roster";
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
