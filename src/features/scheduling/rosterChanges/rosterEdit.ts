import dayjs from "dayjs";
import { WEEKDAYS, type Weekday } from "@/common/weekdays";
import type {
	RosterChangeCell,
	RosterCheck,
} from "@/features/scheduling/rosterChanges/api";
import { needsDecision } from "@/features/scheduling/rosterChanges/rosterLeave";
import type {
	ScheduleAssignment,
	ScheduleShift,
} from "@/features/scheduling/schedules/api";

/*
 * What a hand change to one roster day is, without any I/O: the cells a
 * choice sends, the shifts and partners it can choose from, what the checks
 * ask before applying, and the roster rows once the change is in.
 */

/** What the person chose to do with a day. */
export type RosterEditChoice =
	| { kind: "shift"; shiftId: string }
	| { kind: "dayOff"; dayType?: string }
	| { kind: "swap"; partner: ScheduleAssignment };

/** One roster day's place on the grid: whose day, which date. */
export const rosterCellKey = (membershipId: string, day: string): string =>
	`${membershipId}|${day}`;

/** The weekday an ISO date falls on, as shifts name their days. */
const weekdayOf = (day: string): Weekday =>
	// dayjs counts Sunday as 0; WEEKDAYS starts on Monday.
	WEEKDAYS[(dayjs(day).day() + 6) % 7] ?? "MON";

/** A day not worked, as a change sends it: with its type, or none when none was chosen. */
const offCell = (
	membershipId: string,
	day: string,
	dayType: string | undefined
): RosterChangeCell =>
	dayType === undefined
		? { membershipId, day, kind: "OFF" }
		: { membershipId, day, kind: "OFF", dayType };

/** What a roster row holds, as a change sends it; leave is never sent. */
const cellOf = (
	membershipId: string,
	day: string,
	shiftId: string | undefined
): RosterChangeCell =>
	shiftId === undefined
		? offCell(membershipId, day, undefined)
		: { membershipId, day, kind: "WORK", shiftId };

/**
 * The cells a choice sends for `assignment`'s day: one for a new shift or a
 * day off, two for a same-day swap, each day taking what the other held.
 * Nothing while the choice is incomplete or names no member.
 */
export const cellsForChoice = (
	assignment: ScheduleAssignment,
	choice: RosterEditChoice | undefined
): Array<RosterChangeCell> => {
	const membershipId = assignment.member?.membershipId;
	if (membershipId === undefined || choice === undefined) return [];
	const day = assignment.day;
	if (choice.kind === "shift")
		return [cellOf(membershipId, day, choice.shiftId)];
	if (choice.kind === "dayOff")
		return [offCell(membershipId, day, choice.dayType)];
	const partnerId = choice.partner.member?.membershipId;
	if (partnerId === undefined) return [];
	return [
		cellOf(membershipId, day, choice.partner.shift?.shiftId),
		cellOf(partnerId, day, assignment.shift?.shiftId),
	];
};

/**
 * The types a day can be made when it is not worked, from the schedule's
 * list. A part-timer's day takes none: without a shift it is only absent. A
 * day already not worked leaves out its own type, which would change nothing,
 * unless a manager must confirm it. Pure.
 */
export const dayTypeChoices = (
	nonWorkingDayTypes: ReadonlyArray<string>,
	assignment: ScheduleAssignment
): Array<string> => {
	if (assignment.member?.partTime) return [];
	if (assignment.shift !== null || needsDecision(assignment))
		return [...nonWorkingDayTypes];
	return nonWorkingDayTypes.filter((code) => code !== assignment.dayType);
};

/**
 * The type picked first: the day's own when it is offered, so a worked rest
 * day stays a rest day, else the first offered. Pure.
 */
export const preselectedDayType = (
	choices: ReadonlyArray<string>,
	currentDayType: string | null
): string | undefined =>
	currentDayType !== null && choices.includes(currentDayType)
		? currentDayType
		: choices[0];

/** How the choice not to work a day reads, as `scheduling.rosterEdit` keys it. */
export type NotWorkingWording =
	| "confirmDayOff"
	| "confirmNoShift"
	| "notWorking"
	| "removeShift"
	| "anotherDayType";

/**
 * How the choice not to work a day reads: confirming a day a manager must
 * decide (a part-timer has no day off, so theirs confirms no shift); a leave
 * day going back to not worked; removing a part-timer's shift, which leaves
 * the day absent; another type for a day already not worked; else making a
 * worked day not worked. Pure.
 */
export const notWorkingWording = (
	assignment: ScheduleAssignment,
	leaveDayEditable: boolean
): NotWorkingWording => {
	if (needsDecision(assignment))
		return assignment.member?.partTime ? "confirmNoShift" : "confirmDayOff";
	if (leaveDayEditable) return "notWorking";
	if (assignment.member?.partTime) return "removeShift";
	if (assignment.shift === null) return "anotherDayType";
	return "notWorking";
};

/**
 * The job title a member is rostered as this week, read from any of their
 * working days; null when they work none, so no shift can be ruled out here.
 */
export const rosteredJobTitleId = (
	assignments: ReadonlyArray<ScheduleAssignment>,
	membershipId: string
): string | null =>
	assignments.find(
		(row) => row.member?.membershipId === membershipId && row.jobTitle !== null
	)?.jobTitle?.jobTitleId ?? null;

/**
 * The frozen shifts the member could work on `day`: those running that
 * weekday and, when their job title is known, open to it. The day's current
 * shift is left out. The API checks again; this only keeps the list short.
 */
export const shiftChoices = (
	shifts: ReadonlyArray<ScheduleShift>,
	day: string,
	jobTitleId: string | null,
	currentShiftId: string | undefined
): Array<ScheduleShift> =>
	shifts.filter(
		(shift) =>
			shift.shiftId !== currentShiftId &&
			shift.days.includes(weekdayOf(day)) &&
			(jobTitleId === null ||
				shift.roles.some((role) => role.jobTitleId === jobTitleId))
	);

/** Who a day can be swapped with, and who can't take part (leave, or left the company). */
export type SwapPartners = {
	available: Array<ScheduleAssignment>;
	unavailable: Array<ScheduleAssignment>;
};

/**
 * The other members' rows on the same day. A swap between two days off
 * changes nothing, so an off day only swaps with a working one. Leave and
 * former members can't swap; they are listed apart without saying why.
 */
export const swapPartners = (
	assignments: ReadonlyArray<ScheduleAssignment>,
	assignment: ScheduleAssignment
): SwapPartners => {
	const sameDay = assignments.filter(
		(row) =>
			row.day === assignment.day &&
			row.assignmentId !== assignment.assignmentId &&
			(assignment.shift !== null || row.shift !== null)
	);
	const canSwap = (row: ScheduleAssignment): boolean =>
		row.member !== null &&
		row.member.displayName !== null &&
		row.offReason !== "LEAVE";
	return {
		available: sameDay.filter(canSwap),
		unavailable: sameDay.filter((row) => !canSwap(row)),
	};
};

/** What the checks ask before the change may be applied. */
export type ApplyGate = {
	refused: boolean;
	needsTick: boolean;
	needsRemark: boolean;
};

/** Read from the checks, so the app and the API agree on what each level asks. */
export const applyGate = (checks: ReadonlyArray<RosterCheck>): ApplyGate => ({
	refused: checks.some(({ severity }) => severity === "REFUSED"),
	needsTick: checks.some(
		({ severity }) =>
			severity === "NEEDS_REMARK" || severity === "NEEDS_ACKNOWLEDGEMENT"
	),
	needsRemark: checks.some(({ severity }) => severity === "NEEDS_REMARK"),
});

/** Whether Apply may be pressed: nothing refuses, the tick is given and a remark written when asked. */
export const canApply = (
	gate: ApplyGate,
	ticked: boolean,
	remark: string
): boolean =>
	!gate.refused &&
	(!gate.needsTick || ticked) &&
	(!gate.needsRemark || remark.trim().length > 0);

/**
 * How many people a change to a published roster tells: each member whose
 * days it changes, once, however many of their days it touches.
 */
export const peopleTold = (
	cells: ReadonlyArray<{ membershipId: string | null }>
): number =>
	new Set(
		cells.flatMap((cell) =>
			cell.membershipId === null ? [] : [cell.membershipId]
		)
	).size;

/** The roster with the changed rows in place of their old selves, in the same order. */
export const patchRoster = (
	rows: ReadonlyArray<ScheduleAssignment>,
	changed: ReadonlyArray<ScheduleAssignment>
): Array<ScheduleAssignment> => {
	const byId = new Map(changed.map((row) => [row.assignmentId, row]));
	return rows.map((row) => byId.get(row.assignmentId) ?? row);
};
