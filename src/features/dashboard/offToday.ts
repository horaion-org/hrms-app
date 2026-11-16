import type { DayOff } from "@/features/dashboard/api";
import type { LeaveRequest } from "@/features/leave/api";

/*
 * Who is off on each day the Off today card shows: approved leave from the
 * leave list, rostered days off from the live rosters. Pure.
 */

/** One person off on one day, and why. */
export type PersonOff =
	| { kind: "leave"; key: string; name: string; request: LeaveRequest }
	| {
			kind: "dayOff";
			key: string;
			name: string | null;
			dayTypeName: string | null;
	  };

/** One day's people off: leave first, then days off, each by name. */
export type DayOffGroup = { day: string; people: Array<PersonOff> };

const byName = (first: PersonOff, second: PersonOff): number =>
	(first.name ?? "").localeCompare(second.name ?? "");

/**
 * For each day, the people on approved leave that day and those rostered
 * off. Someone on leave is not listed again for a rostered day off.
 */
export const offByDay = (
	days: ReadonlyArray<string>,
	leave: ReadonlyArray<LeaveRequest>,
	daysOff: ReadonlyArray<DayOff>
): Array<DayOffGroup> =>
	days.map((day) => {
		const onLeave = leave.filter(
			(request) => request.startDate <= day && day <= request.endDate
		);
		const onLeaveIds = new Set(onLeave.map((request) => request.membershipId));
		const leaveRows: Array<PersonOff> = onLeave.map((request) => ({
			kind: "leave",
			key: `leave|${request.leaveRequestId}`,
			name: request.displayName,
			request,
		}));
		const offRows: Array<PersonOff> = daysOff
			.filter((off) => off.day === day && !onLeaveIds.has(off.membershipId))
			.map((off) => ({
				kind: "dayOff",
				key: `off|${off.membershipId}`,
				name: off.displayName,
				dayTypeName: off.dayTypeName,
			}));
		return {
			day,
			people: [...leaveRows.sort(byName), ...offRows.sort(byName)],
		};
	});
