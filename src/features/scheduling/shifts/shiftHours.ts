import {
	MINUTES_PER_DAY,
	MINUTES_PER_HOUR,
	minutesOfDay,
} from "@/common/timeOfDay";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";
import { WEEKDAYS, type Weekday } from "@/features/scheduling/shifts/api";

/*
 * A shift's length and paid hours, and its days read as "Weekdays": the
 * arithmetic the wizards, the roster, cover offers and the shift dialog share.
 */

/** How long a shift lasts in minutes, counting past midnight. */
export const shiftMinutes = (
	shift: Pick<ScheduleShift, "startTime" | "endTime">
): number => {
	const length =
		(minutesOfDay(shift.endTime) -
			minutesOfDay(shift.startTime) +
			MINUTES_PER_DAY) %
		MINUTES_PER_DAY;
	return length === 0 ? MINUTES_PER_DAY : length;
};

/** How long a shift lasts in hours, counting past midnight. */
export const shiftHours = (
	shift: Pick<ScheduleShift, "startTime" | "endTime">
): number => shiftMinutes(shift) / MINUTES_PER_HOUR;

/** A shift's length less its unpaid break, in minutes. */
export const paidShiftMinutes = (
	shift: Pick<ScheduleShift, "startTime" | "endTime" | "unpaidBreakMinutes">
): number => shiftMinutes(shift) - shift.unpaidBreakMinutes;

/**
 * Minutes as hours to two places, as the roster export shows them. Sum the
 * minutes first and round the total once, so totals match the export and the
 * hours ledger.
 */
export const hoursFromMinutes = (minutes: number): number =>
	Math.round((minutes * 100) / MINUTES_PER_HOUR) / 100;

/** A shift's paid hours, to two places. */
export const paidShiftHours = (
	shift: Pick<ScheduleShift, "startTime" | "endTime" | "unpaidBreakMinutes">
): number => hoursFromMinutes(paidShiftMinutes(shift));

/** Monday to Friday: the days of the week before Saturday. */
const MONDAY_TO_FRIDAY: ReadonlyArray<Weekday> = WEEKDAYS.slice(
	0,
	WEEKDAYS.indexOf("SAT")
);

/** Monday to Friday exactly, which reads better as "Weekdays". */
export const isWeekdays = (days: Array<Weekday>): boolean =>
	days.length === MONDAY_TO_FRIDAY.length &&
	MONDAY_TO_FRIDAY.every((day) => days.includes(day));
