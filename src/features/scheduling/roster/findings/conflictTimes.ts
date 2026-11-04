import type { FindingsConflict } from "@/features/scheduling/schedules/api";

/** "2026-10-17T09:00:00" → "09:00"; a plain "09:00" stays as it is. */
const clockTime = (dateTime: string): string =>
	(dateTime.split("T")[1] ?? dateTime).slice(0, 5);

/**
 * A conflict's span as clock times. The engine writes the span as datetimes
 * in the schedule's own time; the wall-clock part is what the roster shows.
 */
export const conflictClockTimes = ({
	start,
	end,
}: Pick<FindingsConflict, "start" | "end">): {
	startTime: string;
	endTime: string;
} => ({ startTime: clockTime(start), endTime: clockTime(end) });
