import type { SchedulePeriod } from "@/features/scheduling/periods";
import { shiftHours } from "@/features/scheduling/scheduleDraft";
import { daysOf, weeksOf } from "@/features/scheduling/schedules";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/*
 * A generated schedule's roster as the roster page shows it: one row per
 * member, one cell per day. Built from `GET …/assignments` without any I/O,
 * so every rule here is unit-tested on plain rows.
 */

/** A worked day: the frozen shift and the job title it is worked as. */
export type RosterShiftCell = {
	kind: "shift";
	assignmentId: string;
	shiftId: string;
	name: string;
	group: string;
	/** "#RRGGBB", as the frozen shift was coloured. */
	colour: string;
	/** "HH:mm"; an end at or before the start runs past midnight. */
	start: string;
	end: string;
	/** The job title's name, as frozen with the shift. */
	role: string;
	note?: RosterDayNote;
};

/** What the leave records add to a day the roster alone cannot say. */
export type RosterDayNote = {
	flag?: NonNullable<ScheduleAssignment["flag"]>;
	leaveRequestId?: string;
	leaveTypeName?: string;
	/** The shift this day's absence leaves short, by name; absent when none is. */
	uncoveredShiftName?: string;
};

/** Approved leave, named by its leave type when the API names it. */
export type RosterLeaveCell = {
	kind: "leave";
	leaveTypeName?: string;
	note?: RosterDayNote;
};

/** One member's day: a shift, a plain day off, or approved leave. */
export type RosterCell =
	RosterShiftCell | { kind: "off"; note?: RosterDayNote } | RosterLeaveCell;

/** One member's week. */
export type RosterRow = {
	/** The membership, or the assignment's own id once the member no longer resolves. */
	key: string;
	membershipId: string | null;
	/** The member's profile, which their starting context is keyed by; absent once they no longer resolve. */
	memberProfileId?: string;
	/** Null once the member, or their membership, is removed. */
	name: string | null;
	/** Their current home job title, which may differ from a shift's role. */
	jobTitle: string | null;
	employeeCode: string | null;
	/** Each day of the period the member has a row for, by ISO date. */
	days: Record<string, RosterCell>;
};

/** One entry of a roster's legend: a plain day off, leave, or one of its shifts. */
export type RosterLegendEntry =
	| { kind: "off" }
	| { kind: "leave" }
	| { kind: "shift"; shiftId: string; name: string; colour: string };

/** What the roster's stat cards count. */
export type RosterStats = {
	/** Members with at least one shift. */
	staffRostered: number;
	staffTotal: number;
	shifts: number;
	daysOff: number;
	onLeave: number;
};

const offCellOf = ({
	offReason,
	leaveTypeName,
}: ScheduleAssignment): RosterCell => {
	if (offReason !== "LEAVE") return { kind: "off" };
	return leaveTypeName ? { kind: "leave", leaveTypeName } : { kind: "leave" };
};

/** The day's note, or nothing on a day with nothing to add. */
const noteOf = ({
	flag,
	leaveRequestId,
	leaveTypeName,
	uncoveredShift,
}: ScheduleAssignment): RosterDayNote | undefined => {
	if (!flag && !uncoveredShift) return undefined;
	return {
		...(flag ? { flag } : {}),
		...(leaveRequestId ? { leaveRequestId } : {}),
		...(leaveTypeName ? { leaveTypeName } : {}),
		...(uncoveredShift ? { uncoveredShiftName: uncoveredShift.name } : {}),
	};
};

const cellOf = (assignment: ScheduleAssignment): RosterCell => {
	const note = noteOf(assignment);
	if (assignment.shift === null) {
		const cell = offCellOf(assignment);
		return note ? { ...cell, note } : cell;
	}
	return {
		kind: "shift",
		assignmentId: assignment.assignmentId,
		shiftId: assignment.shift.shiftId,
		name: assignment.shift.name,
		group: assignment.shift.group,
		colour: assignment.shift.colour,
		start: assignment.shift.startTime,
		end: assignment.shift.endTime,
		role: assignment.jobTitle?.name ?? "",
		...(note ? { note } : {}),
	};
};

const rowOf = ({ assignmentId, member }: ScheduleAssignment): RosterRow =>
	member === null
		? {
				key: assignmentId,
				membershipId: null,
				name: null,
				jobTitle: null,
				employeeCode: null,
				days: {},
			}
		: {
				key: member.membershipId,
				membershipId: member.membershipId,
				memberProfileId: member.memberProfileId,
				name: member.displayName,
				jobTitle: member.jobTitleName,
				employeeCode: member.employeeCode,
				days: {},
			};

const within = (day: string, period: SchedulePeriod): boolean =>
	day >= period.start && day <= period.end;

/**
 * The roster's rows in the order the API sends them (by display name, then
 * member). A member's days join one row by membership; a row whose member no
 * longer resolves can't be joined and stays on its own, keyed by its
 * assignment. Days outside `period` are dropped.
 */
export const rosterFromAssignments = (
	assignments: ReadonlyArray<ScheduleAssignment>,
	period: SchedulePeriod
): Array<RosterRow> => {
	const rows = new Map<string, RosterRow>();
	for (const assignment of assignments) {
		if (!within(assignment.day, period)) continue;
		const fresh = rowOf(assignment);
		const row = rows.get(fresh.key) ?? fresh;
		row.days[assignment.day] = cellOf(assignment);
		rows.set(row.key, row);
	}
	return [...rows.values()];
};

/** Hours a day adds up to: a shift's length (past midnight when it ends at or before its start); 0 off. */
export const hoursOf = (cell: RosterCell | undefined): number =>
	cell?.kind === "shift"
		? shiftHours({ startTime: cell.start, endTime: cell.end })
		: 0;

/** Hours a row adds up to over `days`. */
export const hoursInDays = (
	row: RosterRow,
	days: ReadonlyArray<string>
): number => days.reduce((total, day) => total + hoursOf(row.days[day]), 0);

/** A date format in `timeZone` (an IANA name); the browser's own zone when the name is unknown. */
export const dateTimeFormatIn = (
	language: string,
	timeZone: string,
	options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat => {
	try {
		return new Intl.DateTimeFormat(language, { ...options, timeZone });
	} catch {
		return new Intl.DateTimeFormat(language, options);
	}
};

/**
 * Today's ISO date in `timeZone` (the branch's IANA zone), so "this week"
 * follows the schedule rather than the browser.
 */
export const isoDateIn = (timeZone: string, now: Date): string => {
	const parts = dateTimeFormatIn("en-US", timeZone, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);
	const part = (type: Intl.DateTimeFormatPartTypes): string =>
		parts.find((item) => item.type === type)?.value ?? "";
	return `${part("year")}-${part("month")}-${part("day")}`;
};

/** The seven dates of `week` (a Monday) when it is one of the period's weeks, otherwise of its first week. */
export const weekDays = (
	period: SchedulePeriod,
	week: string
): Array<string> => {
	const weeks = weeksOf(period);
	const shown = weeks.find((item) => item.start === week) ?? weeks[0];
	return shown ? daysOf(shown.start) : [];
};

/** A day off, leave, then each distinct shift of the rows by group and name. */
export const legendOf = (
	rows: ReadonlyArray<RosterRow>
): Array<RosterLegendEntry> => {
	const shifts = new Map<string, RosterShiftCell>();
	for (const row of rows)
		for (const cell of Object.values(row.days))
			if (cell.kind === "shift" && !shifts.has(cell.shiftId))
				shifts.set(cell.shiftId, cell);
	const ordered = [...shifts.values()].sort(
		(a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)
	);
	return [
		{ kind: "off" },
		{ kind: "leave" },
		...ordered.map(({ shiftId, name, colour }) => ({
			kind: "shift" as const,
			shiftId,
			name,
			colour,
		})),
	];
};

/** Counts every cell of the rows. */
export const rosterStats = (rows: ReadonlyArray<RosterRow>): RosterStats => {
	const cells = rows.flatMap((row) => Object.values(row.days));
	const count = (kind: RosterCell["kind"]): number =>
		cells.filter((cell) => cell.kind === kind).length;
	return {
		staffRostered: rows.filter((row) =>
			Object.values(row.days).some((cell) => cell.kind === "shift")
		).length,
		staffTotal: rows.length,
		shifts: count("shift"),
		daysOff: count("off"),
		onLeave: count("leave"),
	};
};
