import type { DayOff } from "@/features/dashboard/api";
import type { LeaveRequest } from "@/features/leave/api";

/**
 * How many people are off on a day: those on approved leave that day and
 * those rostered off, each person once. Pure.
 */
export const peopleOffOn = (
	day: string,
	leave: ReadonlyArray<LeaveRequest>,
	daysOff: ReadonlyArray<DayOff>
): number =>
	new Set([
		...leave
			.filter((request) => request.startDate <= day && day <= request.endDate)
			.map((request) => request.membershipId),
		...daysOff.filter((off) => off.day === day).map((off) => off.membershipId),
	]).size;
