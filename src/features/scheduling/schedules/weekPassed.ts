import { isoDateIn } from "@/features/scheduling/roster/roster";
import type { Schedule } from "@/features/scheduling/schedules/api";

/**
 * Whether a schedule's week has passed: from the day after its Sunday in
 * its branch's time zone, as the API decides it (ADR-0091). A passed week
 * is never generated again. Pure.
 */
export const weekPassed = (
	schedule: Pick<Schedule, "periodEnd" | "timeZone">,
	now: Date
): boolean => isoDateIn(schedule.timeZone, now) > schedule.periodEnd;
