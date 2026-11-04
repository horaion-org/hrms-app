/*
 * Scheduling helpers shared by the overview and a schedule's roster: each
 * status's badge tone and the period's weeks and days.
 */
import dayjs, { type Dayjs } from "dayjs";
import type { BadgeTone } from "@/components/ui/Badge";
import type { SchedulePeriod } from "@/features/scheduling/periods";
import type { ScheduleStatus } from "@/features/scheduling/schedules/api";

export const scheduleStatusTones: Record<ScheduleStatus, BadgeTone> = {
	DRAFT: "neutral",
	GENERATION_REQUESTED: "warning",
	// Generated and not yet decided: someone still has to publish or reject it.
	GENERATED: "warning",
	GENERATION_FAILED: "error",
	PUBLISHED: "success",
	REJECTED: "error",
};

/*
 * The in-memory shift the roster's shift-action dialogs (edit, reassign,
 * duplicate) work on. Not yet wired to a roster: generated rosters are
 * read-only until assignments can be changed through the API.
 */

/** A filled shift is "full" or "half"; an "open" one has nobody yet. */
export type RosterShiftKind = "full" | "half" | "open";

export type RosterShift = {
	shiftId: string;
	branchId?: string;
	departmentId?: string;
	jobTitleId?: string;
	/** ISO date. */
	date: string;
	/** "HH:mm" */
	start: string;
	end: string;
	role: string;
	kind: RosterShiftKind;
	breakMinutes: number;
	location: string;
	notes?: string;
};

export type RosterStaff = {
	staffId: string;
	departmentName?: string;
	name: string;
	jobTitle: string;
	/** At most one shift a day; a day without one is a day off. */
	shifts: Array<RosterShift>;
};

const iso = (day: Dayjs): string => day.format("YYYY-MM-DD");

/** The Monday on or before `date`. */
export const mondayOf = (date: Date | string): string => {
	const day = dayjs(date);
	return iso(day.subtract((day.day() + 6) % 7, "day"));
};

/** Each week-long period within a schedule's period, Monday first. */
export const weeksOf = (period: SchedulePeriod): Array<SchedulePeriod> => {
	const weeks: Array<SchedulePeriod> = [];
	for (
		let start = dayjs(mondayOf(period.start));
		!start.isAfter(period.end, "day");
		start = start.add(1, "week")
	)
		weeks.push({ start: iso(start), end: iso(start.add(6, "day")) });
	return weeks;
};

/** The seven dates of the week starting on `monday`. */
export const daysOf = (monday: string): Array<string> =>
	Array.from({ length: 7 }, (_, offset) =>
		iso(dayjs(monday).add(offset, "day"))
	);
