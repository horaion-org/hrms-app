import type { RosterHours } from "@/features/scheduling/hours/api";
import {
	generationInProgress,
	type Schedule,
	type ScheduleAssignment,
} from "@/features/scheduling/schedules/api";

/*
 * The roster's Hours table, pure: the API sends each person's minutes by
 * public id, and the roster's own rows name them and set their order.
 */

/** One line of the Hours table: a person, or the roster's total. */
export type RosterHoursRow = {
	key: string;
	name: string;
	isTotal: boolean;
	daysWorked: number;
	normalMinutes: number;
	extraMinutes: number;
	overtimeMinutes: number;
	/** Approved leave the week counts towards its hours. */
	countedLeaveMinutes: number;
};

/** The words the rows need: a person who left, and the total line. */
export type RosterHoursNames = { formerMember: string; total: string };

/** The key of the total line; never a member profile id. */
export const TOTAL_ROW_KEY = "total";

/**
 * Whether the hours ledger holds this roster's days: a generated or
 * published roster with no run open. A rejected roster no longer counts, so
 * it has no hours to show.
 */
export const hasRosterHours = (schedule: Schedule): boolean =>
	(schedule.status === "GENERATED" || schedule.status === "PUBLISHED") &&
	!generationInProgress(schedule);

/** Each member's name and place in the roster, by member profile id, in the roster's own order (by name). */
const rosterMembersOf = (
	assignments: ReadonlyArray<ScheduleAssignment>
): Map<string, string | null> => {
	const members = new Map<string, string | null>();
	for (const { member } of assignments) {
		if (member && !members.has(member.memberProfileId))
			members.set(member.memberProfileId, member.displayName);
	}
	return members;
};

/** Whether some line of the week counts leave, so the table shows a Leave column. Pure. */
export const showsCountedLeave = (
	rows: ReadonlyArray<RosterHoursRow>
): boolean => rows.some((row) => row.countedLeaveMinutes > 0);

/**
 * One row per person in the roster's order, a person the roster no longer
 * names last, then the total line.
 */
export const rosterHoursRows = (
	hours: RosterHours,
	assignments: ReadonlyArray<ScheduleAssignment>,
	names: RosterHoursNames
): Array<RosterHoursRow> => {
	const rosterMembers = rosterMembersOf(assignments);
	const order = [...rosterMembers.keys()];
	const placeOf = (memberProfileId: string): number => {
		const place = order.indexOf(memberProfileId);
		return place === -1 ? order.length : place;
	};
	const people = [...hours.members]
		.sort(
			(first, second) =>
				placeOf(first.memberProfileId) - placeOf(second.memberProfileId)
		)
		.map((member): RosterHoursRow => ({
			...member,
			key: member.memberProfileId,
			name: rosterMembers.get(member.memberProfileId) ?? names.formerMember,
			isTotal: false,
		}));
	if (people.length === 0) return [];
	return [
		...people,
		{ ...hours.totals, key: TOTAL_ROW_KEY, name: names.total, isTotal: true },
	];
};
