/*
 * Schedules for the Scheduling overview and a schedule's roster. There is no
 * scheduling API yet, so `exampleSchedules` builds example data relative to
 * today; the pages label it as such. Swap these functions for API reads once
 * the endpoints exist; the components only depend on the types.
 */
import dayjs, { type Dayjs } from "dayjs";
import type { BadgeTone } from "@/components/ui/Badge";
import type { ProgressBarTone } from "@/components/ui/ProgressBar";
import type { SchedulePeriod } from "@/features/scheduling/periods";

export const SCHEDULE_STATUSES = [
	"PROCESSING",
	"PENDING",
	"APPROVED",
	"COMPLETED",
	"ARCHIVED",
	"CANCELLED",
] as const;

export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const scheduleStatusTones: Record<ScheduleStatus, BadgeTone> = {
	PROCESSING: "neutral",
	PENDING: "warning",
	APPROVED: "success",
	COMPLETED: "success",
	ARCHIVED: "neutral",
	CANCELLED: "error",
};

/** Green from 95%, amber from 85%, red below. */
export const coverageTone = (coverage: number): ProgressBarTone => {
	if (coverage >= 95) return "success";
	return coverage >= 85 ? "warning" : "error";
};

/** One department's schedule for a period. */
export type ScheduleRecord = {
	scheduleId: string;
	/** e.g. "FO-260413": the department's prefix and the period's first day. */
	code: string;
	departmentName: string;
	period: SchedulePeriod;
	status: ScheduleStatus;
	/** ISO date-time. */
	createdAt: string;
	/** Share of shifts filled, 0–100; unknown while processing. */
	coverage?: number;
	openShifts?: number;
	conflicts?: number;
};

/** A filled shift is "full" or "half"; an "open" one has nobody yet. */
export type RosterShiftKind = "full" | "half" | "open";

export type RosterShift = {
	shiftId: string;
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
	name: string;
	jobTitle: string;
	/** At most one shift a day; a day without one is a day off. */
	shifts: Array<RosterShift>;
};

export type RosterGroup = {
	groupId: string;
	name: string;
	/** People in the group, including those not listed. */
	headcount: number;
	staff: Array<RosterStaff>;
};

export type ScheduleDetail = ScheduleRecord & {
	staffAssigned: number;
	staffTotal: number;
	groups: Array<RosterGroup>;
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

const codeOf = (prefix: string, start: Dayjs): string =>
	`${prefix}-${start.format("YYMMDD")}`;

const DEPARTMENTS = [
	{ prefix: "FO", name: "Front Office" },
	{ prefix: "HK", name: "Housekeeping" },
	{ prefix: "FNB", name: "Food & Beverage" },
	{ prefix: "KIT", name: "Kitchen" },
	{ prefix: "SC", name: "Service Crew" },
] as const;

const CURRENT = [
	{ status: "PENDING", coverage: 98.2, openShifts: 2, conflicts: 0 },
	{ status: "PENDING", coverage: 92.4, openShifts: 5, conflicts: 1 },
	{ status: "APPROVED", coverage: 100, openShifts: 0, conflicts: 0 },
	{ status: "PENDING", coverage: 84.7, openShifts: 11, conflicts: 4 },
	{ status: "PENDING", coverage: 88.3, openShifts: 7, conflicts: 2 },
] as const;

const HISTORY = [
	{ department: 0, weeksAgo: 2, status: "COMPLETED", createdDaysEarlier: 8 },
	{ department: 1, weeksAgo: 4, status: "COMPLETED", createdDaysEarlier: 7 },
	{ department: 3, weeksAgo: 6, status: "ARCHIVED", createdDaysEarlier: 7 },
	{ department: 4, weeksAgo: 8, status: "CANCELLED", createdDaysEarlier: 14 },
	{ department: 2, weeksAgo: 10, status: "COMPLETED", createdDaysEarlier: 29 },
] as const;

export type ExampleSchedules = {
	/** This fortnight's schedule for each department. */
	current: Array<ScheduleRecord>;
	/** Earlier schedules, newest first. */
	history: Array<ScheduleRecord>;
};

/** Stand-in schedules around `today` until the scheduling API exists. */
export const exampleSchedules = (today: Date): ExampleSchedules => {
	const start = dayjs(mondayOf(today));
	const fortnight = (from: Dayjs): SchedulePeriod => ({
		start: iso(from),
		end: iso(from.add(13, "day")),
	});
	const current = DEPARTMENTS.map((department, index) => {
		const figures = CURRENT[index] ?? CURRENT[0];
		return {
			scheduleId: codeOf(department.prefix, start).toLowerCase(),
			code: codeOf(department.prefix, start),
			departmentName: department.name,
			period: fortnight(start),
			createdAt: start.subtract(6, "day").hour(9).minute(30).toISOString(),
			...figures,
		};
	});
	const history = HISTORY.map((entry) => {
		const department = DEPARTMENTS[entry.department] ?? DEPARTMENTS[0];
		const from = start.subtract(entry.weeksAgo, "week");
		return {
			scheduleId: codeOf(department.prefix, from).toLowerCase(),
			code: codeOf(department.prefix, from),
			departmentName: department.name,
			period: fortnight(from),
			status: entry.status,
			createdAt: from
				.subtract(entry.createdDaysEarlier, "day")
				.hour(13)
				.minute(5)
				.toISOString(),
		};
	});
	return { current, history };
};

type WeekPattern = Array<RosterShiftKind | "off">;

const PEOPLE: Array<{
	name: string;
	jobTitle: string;
	pattern: WeekPattern;
	notes?: Partial<Record<number, string>>;
}> = [
	{
		name: "John Lim",
		jobTitle: "Front Office Manager",
		pattern: ["full", "full", "off", "full", "off", "half", "full"],
		notes: { 3: "Swapped with Wednesday to avoid consecutive days." },
	},
	{
		name: "Aisha Rahman",
		jobTitle: "Front Desk Staff",
		pattern: ["full", "full", "half", "half", "full", "full", "off"],
	},
	{
		name: "Wei Jun",
		jobTitle: "Service Crew",
		pattern: ["off", "full", "full", "off", "full", "full", "full"],
	},
	{
		name: "Marcus Tan",
		jobTitle: "Housekeeping Supervisor",
		pattern: ["full", "off", "full", "full", "full", "off", "full"],
	},
	{
		name: "Priya Nair",
		jobTitle: "Guest Relations Officer",
		pattern: ["off", "full", "full", "open", "full", "full", "full"],
	},
	{
		name: "Ethan Wong",
		jobTitle: "Front Desk Staff",
		pattern: ["off", "full", "full", "full", "off", "open", "full"],
	},
	{
		name: "Cheryl Ng",
		jobTitle: "Night Auditor",
		pattern: ["half", "half", "off", "full", "full", "full", "off"],
	},
	{
		name: "Faris Ahmad",
		jobTitle: "Concierge",
		pattern: ["full", "off", "full", "full", "half", "off", "full"],
	},
];

const OTHER_GROUPS = [
	{ name: "Housekeeping", headcount: 6 },
	{ name: "Food & Beverage", headcount: 5 },
	{ name: "Service Crew", headcount: 5 },
];

const HOURS: Record<RosterShiftKind, number> = { full: 8, half: 4, open: 8 };

const slug = (text: string): string =>
	text.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** A stand-in roster for one of `exampleSchedules`; undefined for an unknown id. */
export const exampleScheduleDetail = (
	scheduleId: string,
	today: Date
): ScheduleDetail | undefined => {
	const { current, history } = exampleSchedules(today);
	const schedule = [...current, ...history].find(
		(record) => record.scheduleId === scheduleId
	);
	if (!schedule) return undefined;
	const days = weeksOf(schedule.period).flatMap((week) => daysOf(week.start));
	const staff = PEOPLE.map((person): RosterStaff => {
		const shifts = days.flatMap((date, index): Array<RosterShift> => {
			const kind = person.pattern[index % 7] ?? "off";
			if (kind === "off") return [];
			const open = kind === "open";
			return [
				{
					shiftId: `${slug(person.name)}-${date}`,
					date,
					start: open ? "13:00" : "09:00",
					end: open ? "22:00" : "18:00",
					role: open ? "Open Shift" : "Front Desk",
					kind,
					breakMinutes: kind === "half" ? 0 : 60,
					location: "Main Branch",
					notes: index < 7 ? person.notes?.[index] : undefined,
				},
			];
		});
		return {
			staffId: slug(person.name),
			name: person.name,
			jobTitle: person.jobTitle,
			shifts,
		};
	});
	return {
		...schedule,
		staffAssigned: 24,
		staffTotal: 24,
		groups: [
			{
				groupId: slug(schedule.departmentName),
				name: schedule.departmentName,
				headcount: staff.length,
				staff,
			},
			...OTHER_GROUPS.filter(
				(group) => group.name !== schedule.departmentName
			).map((group) => ({
				groupId: slug(group.name),
				name: group.name,
				headcount: group.headcount,
				staff: [],
			})),
		],
	};
};

/** Hours a set of shifts adds up to, counting a half shift as four. */
export const rosteredHours = (shifts: Array<RosterShift>): number =>
	shifts.reduce((total, shift) => total + HOURS[shift.kind], 0);
