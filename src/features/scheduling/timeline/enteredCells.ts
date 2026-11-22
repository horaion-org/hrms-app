import type { StartingDays } from "@/features/scheduling/startingContext/api";
import {
	type EnteredDayBefore,
	enteredDaysBeforeOf,
	isInDaysBeforeRun,
} from "@/features/scheduling/startingContext/enteredDays";
import {
	scheduleOfDay,
	type TimelineSchedule,
} from "@/features/scheduling/timeline/timeline";
import type {
	EnteredTimelineCell,
	TimelineRow,
} from "@/features/scheduling/timeline/timelineRows";

/*
 * The days entered by hand before a run, placed on the timeline without I/O:
 * only on days no schedule covers, the ones that would read "No roster". They
 * are shown, never rostered: the status strip and "Needs you" do not read them.
 */

/** One day entered by hand, and the schedule whose run it was entered for. */
export type EnteredCell = EnteredDayBefore & { scheduleId: string };

/** The days of the window no schedule covers. */
const daysWithoutSchedule = (
	schedules: ReadonlyArray<TimelineSchedule>,
	days: ReadonlyArray<string>
): Array<string> =>
	days.filter((day) => scheduleOfDay(schedules, day) === undefined);

/**
 * The schedules whose entered days are read: those with a day of the window
 * no schedule covers among the days before their run. None when every day of
 * the window has a schedule, so such a window asks for nothing more.
 */
export const schedulesWithFreeDaysBefore = (
	schedules: ReadonlyArray<TimelineSchedule>,
	days: ReadonlyArray<string>
): Array<TimelineSchedule> => {
	const freeDays = daysWithoutSchedule(schedules, days);
	return schedules.filter((schedule) =>
		freeDays.some((day) => isInDaysBeforeRun(schedule.firstDay, day))
	);
};

/**
 * The entered days to show: each one on a day of the window no schedule
 * covers, so a day with a roster is never overridden. When two runs hold the
 * same person's day, the run starting soonest after it is the one kept.
 */
export const enteredCellsOf = (
	schedules: ReadonlyArray<TimelineSchedule>,
	startingDaysOf: Readonly<Record<string, StartingDays>>,
	days: ReadonlyArray<string>
): Array<EnteredCell> => {
	const freeDays = new Set(daysWithoutSchedule(schedules, days));
	const cells = new Map<string, EnteredCell>();
	// Latest run first, so an earlier run's day replaces a later run's.
	const latestFirst = [...schedules].sort((left, right) =>
		right.firstDay.localeCompare(left.firstDay)
	);
	for (const schedule of latestFirst) {
		const startingDays = startingDaysOf[schedule.id];
		if (!startingDays) continue;
		for (const entered of enteredDaysBeforeOf(startingDays))
			if (freeDays.has(entered.date))
				cells.set(`${entered.memberProfileId} ${entered.date}`, {
					...entered,
					scheduleId: schedule.id,
				});
	}
	return [...cells.values()];
};

/** A person's entered cells by ISO date, as their row holds them. */
const enteredByDate = (
	cells: ReadonlyArray<EnteredCell>
): Record<string, EnteredTimelineCell> =>
	Object.fromEntries(
		cells.map(({ date, what, scheduleId }) => [date, { what, scheduleId }])
	);

/**
 * The rows with each entered cell on its person's row, found by their
 * profile; someone no roster in the window has gets a row of their own, after
 * the rostered rows. A row's rostered days are left as they are.
 */
export const withEnteredCells = (
	rows: ReadonlyArray<TimelineRow>,
	cells: ReadonlyArray<EnteredCell>
): Array<TimelineRow> => {
	const cellsByProfile = new Map<string, Array<EnteredCell>>();
	for (const cell of cells)
		cellsByProfile.set(cell.memberProfileId, [
			...(cellsByProfile.get(cell.memberProfileId) ?? []),
			cell,
		]);
	const rostered = new Set(rows.map((row) => row.memberProfileId));
	const rosteredRows = rows.map((row) => {
		const own = cellsByProfile.get(row.memberProfileId ?? "");
		return own ? { ...row, entered: enteredByDate(own) } : row;
	});
	const enteredOnlyRows = [...cellsByProfile]
		.filter(([memberProfileId]) => !rostered.has(memberProfileId))
		.map(([memberProfileId, own]): TimelineRow => ({
			key: memberProfileId,
			memberProfileId,
			name: own[0]!.name,
			jobTitle: own[0]!.jobTitle,
			employeeCode: null,
			days: {},
			entered: enteredByDate(own),
		}));
	return [...rosteredRows, ...enteredOnlyRows];
};
