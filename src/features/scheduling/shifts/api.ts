import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import { schedulePath, type DepartmentPath } from "@/features/scheduling/paths";
import { scheduleKey } from "@/features/scheduling/schedules/api";
import { retry } from "@/features/workspace/retry";

/*
 * The shifts API: a schedule's own shifts, read and changed under the
 * `shift` keys at their own routes under the schedule; which of them the
 * schedule includes is set in one request. Paths, fields and codes follow
 * §8, §8.6 and §8.7 of
 * `_implementation_docs/2026-10-08_schedule-setup/2026-10-08_hrms-backend-v2-schedule-setup.md`.
 */

export type { DepartmentPath };

const weekdaySchema = z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);

export type Weekday = z.infer<typeof weekdaySchema>;

/** Monday first, as the week-long periods run. */
export const WEEKDAYS = weekdaySchema.options;

/** A shift's colour as the API keeps it: `#RRGGBB`, upper case. */
export const SHIFT_COLOUR_PATTERN = /^#[0-9A-F]{6}$/;

const shiftRoleSchema = z.object({ jobTitleId: z.string(), name: z.string() });

/** A job title a shift needs people in. */
export type ShiftRole = z.infer<typeof shiftRoleSchema>;

const shiftSchema = z.object({
	shiftId: z.string(),
	scheduleId: z.string(),
	name: z.string(),
	/** The group the shift belongs to: a plain name, shared by the shifts that use it. */
	group: z.string(),
	colour: z.string().regex(SHIFT_COLOUR_PATTERN),
	/** "HH:mm"; an end at or before the start runs past midnight. */
	startTime: z.string(),
	endTime: z.string(),
	days: z.array(weekdaySchema),
	/** Whether the schedule includes it, as last saved; a new shift is included. */
	included: z.boolean(),
	roles: z.array(shiftRoleSchema),
});

/** One of a schedule's shifts, as the API answers it. */
export type Shift = z.infer<typeof shiftSchema>;

/** The groups the shifts belong to, once each, in the order first met. */
export const groupsOf = (shifts: Array<Shift>): Array<string> => [
	...new Set(shifts.map((shift) => shift.group)),
];

/** What creating or replacing a shift sends. */
export type ShiftBody = {
	name: string;
	group: string;
	colour: string;
	startTime: string;
	endTime: string;
	days: Array<Weekday>;
	jobTitleIds: Array<string>;
};

const shiftsPath = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): string => `${schedulePath(companyId, unit, scheduleId)}/shifts`;

const shiftListSchema = z.array(shiftSchema);

/** A schedule's live shifts, ordered by group then name. */
export const fetchShifts = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): Promise<Array<Shift>> =>
	apiRequest(shiftsPath(companyId, unit, scheduleId), shiftListSchema);

/**
 * Includes exactly the named shifts of a draft schedule and leaves out the
 * rest; answers with every shift, as `fetchShifts` does.
 */
export const setShiftInclusion = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	includedShiftIds: Array<string>
): Promise<Array<Shift>> =>
	apiRequest(
		`${shiftsPath(companyId, unit, scheduleId)}/inclusion`,
		shiftListSchema,
		{ method: "PUT", body: { includedShiftIds } }
	);

/** The key a schedule's shifts are cached under, below the schedule's own. */
export const shiftsKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string, "shifts"] =>
	[...scheduleKey(companyId, scheduleId), "shifts"] as const;

/** A schedule's shifts; `unit` undefined, or `allowed` false, asks for nothing. */
export const shiftsQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed = true
): UndefinedInitialDataOptions<
	Array<Shift>,
	Error,
	Array<Shift>,
	readonly ["scheduling", string, "schedules", string, "shifts"]
> =>
	queryOptions({
		queryKey: shiftsKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? (): Promise<Array<Shift>> => fetchShifts(companyId, unit, scheduleId)
				: skipToken,
		staleTime: 30_000,
		retry,
	});

/** Adds a shift to a draft schedule; it starts out included. */
export const createShift = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	body: ShiftBody
): Promise<Shift> =>
	apiRequest(shiftsPath(companyId, unit, scheduleId), shiftSchema, {
		method: "POST",
		body,
	});

export const updateShift = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	shiftId: string,
	body: ShiftBody
): Promise<Shift> =>
	apiRequest(
		`${shiftsPath(companyId, unit, scheduleId)}/${encodeURIComponent(shiftId)}`,
		shiftSchema,
		{ method: "PUT", body }
	);

export const deleteShift = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	shiftId: string
): Promise<void> =>
	apiRequestVoid(
		`${shiftsPath(companyId, unit, scheduleId)}/${encodeURIComponent(shiftId)}`,
		{ method: "DELETE" }
	);
