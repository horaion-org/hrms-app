import { MINUTES_PER_DAY, minutesOfDay, timeOfDay } from "@/common/timeOfDay";
import type { ShiftStretch } from "@/features/scheduling/schedules/api";

/*
 * A worked day stretched into overtime (the API's ADR-0110): the shift kept,
 * with minutes worked before it starts and after it ends. Pure.
 */

/** A day's "HH:mm" start and end; an end at or before the start runs past midnight. */
export type DayTimes = { start: string; end: string };

/**
 * The times a day is worked: the shift's, widened by the stretch. A start
 * pulled before midnight reads as the evening before ("23:00"), an end pushed
 * past it as the next morning ("01:00"). No stretch: the shift's own times.
 */
export const stretchedTimes = (
	shift: DayTimes,
	stretch: ShiftStretch | null | undefined
): DayTimes => {
	if (!stretch) return shift;
	const start =
		minutesOfDay(shift.start) - stretch.beforeMinutes + MINUTES_PER_DAY;
	const end = minutesOfDay(shift.end) + stretch.afterMinutes;
	return { start: timeOfDay(start), end: timeOfDay(end) };
};

/** The minutes a stretch adds to the day; 0 for none. */
export const stretchMinutes = (
	stretch: ShiftStretch | null | undefined
): number => (stretch ? stretch.beforeMinutes + stretch.afterMinutes : 0);

/**
 * The stretch's own times, one span per side it is worked on: before the
 * shift, "05:00"–"06:00", then after it, "14:00"–"16:00". None without a
 * stretch. A span may run past midnight, as a day's times do.
 */
export const stretchSpans = (
	shift: DayTimes,
	stretch: ShiftStretch | null | undefined
): Array<DayTimes> => {
	if (!stretch) return [];
	const start = minutesOfDay(shift.start);
	const end = minutesOfDay(shift.end);
	const spans: Array<DayTimes> = [];
	if (stretch.beforeMinutes > 0)
		spans.push({
			start: timeOfDay(start - stretch.beforeMinutes + MINUTES_PER_DAY),
			end: shift.start,
		});
	if (stretch.afterMinutes > 0)
		spans.push({
			start: shift.end,
			end: timeOfDay(end + stretch.afterMinutes),
		});
	return spans;
};
