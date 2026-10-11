import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import {
	SCHEDULING_QUERY_ROOT,
	shiftRoleOptionsPath,
	shiftsPath,
	type DepartmentPath,
} from "@/features/scheduling/paths";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * The shifts API: one live set of shifts per Department, read and changed
 * under the `shift` keys at the Department's routes. A draft schedule only
 * remembers which of them are ticked (`schedules/api.ts`), so editing or
 * deleting a live shift changes every draft of that Department. Paths,
 * fields and codes follow §2.4 of the API's
 * `docs/implementation/2026-10-11-shifts-module.md`.
 */

export type { DepartmentPath };

export const weekdaySchema = z.enum([
	"MON",
	"TUE",
	"WED",
	"THU",
	"FRI",
	"SAT",
	"SUN",
]);

export type Weekday = z.infer<typeof weekdaySchema>;

/** Monday first, as the week-long periods run. */
export const WEEKDAYS = weekdaySchema.options;

/** A shift's colour as the API keeps it: `#RRGGBB`, upper case. */
export const SHIFT_COLOUR_PATTERN = /^#[0-9A-F]{6}$/;

export const shiftRoleSchema = z.object({
	jobTitleId: z.string(),
	name: z.string(),
});

/** A job title a shift needs people in, or one the shift dialog offers. */
export type ShiftRole = z.infer<typeof shiftRoleSchema>;

const departmentShiftSchema = z.object({
	shiftId: z.string(),
	departmentId: z.string(),
	name: z.string(),
	/** The group the shift belongs to: a plain name, shared by the shifts that use it. */
	group: z.string(),
	colour: z.string().regex(SHIFT_COLOUR_PATTERN),
	/** "HH:mm"; an end at or before the start runs past midnight. */
	startTime: z.string(),
	endTime: z.string(),
	days: z.array(weekdaySchema),
	roles: z.array(shiftRoleSchema),
});

/** One of a Department's live shifts, as the shift routes answer it. */
export type DepartmentShift = z.infer<typeof departmentShiftSchema>;

/** What creating or replacing a live shift sends. */
export type ShiftBody = {
	name: string;
	group: string;
	colour: string;
	startTime: string;
	endTime: string;
	days: Array<Weekday>;
	jobTitleIds: Array<string>;
};

const shiftPath = (
	companyId: string,
	unit: DepartmentPath,
	shiftId: string
): string => `${shiftsPath(companyId, unit)}/${encodeURIComponent(shiftId)}`;

/** Adds a live shift to a Department; every draft of it can then tick it. */
export const createShift = (
	companyId: string,
	unit: DepartmentPath,
	body: ShiftBody
): Promise<DepartmentShift> =>
	apiRequest(shiftsPath(companyId, unit), departmentShiftSchema, {
		method: "POST",
		body,
	});

/** Replaces a live shift; every draft that ticks it sees the change. */
export const updateShift = (
	companyId: string,
	unit: DepartmentPath,
	shiftId: string,
	body: ShiftBody
): Promise<DepartmentShift> =>
	apiRequest(shiftPath(companyId, unit, shiftId), departmentShiftSchema, {
		method: "PUT",
		body,
	});

/** Deletes a live shift; it disappears from every draft. Generated schedules keep their copies. */
export const deleteShift = (
	companyId: string,
	unit: DepartmentPath,
	shiftId: string
): Promise<void> =>
	apiRequestVoid(shiftPath(companyId, unit, shiftId), { method: "DELETE" });

const shiftRoleOptionsSchema = z.array(shiftRoleSchema);

/**
 * The Department's ACTIVE job titles a shift may apply to, under
 * `shift:read`, so a shift editor never needs `job_title:read`.
 */
export const fetchShiftRoleOptions = (
	companyId: string,
	unit: DepartmentPath,
	signal?: AbortSignal
): Promise<Array<ShiftRole>> =>
	apiRequest(shiftRoleOptionsPath(companyId, unit), shiftRoleOptionsSchema, {
		signal,
	});

/** The key a Department's role options are cached under. */
export const shiftRoleOptionsKey = (
	companyId: string,
	departmentId: string
): readonly [
	"scheduling",
	string,
	"departments",
	string,
	"shift-role-options",
] =>
	[
		SCHEDULING_QUERY_ROOT,
		companyId,
		"departments",
		departmentId,
		"shift-role-options",
	] as const;

/** A Department's role options; `unit` undefined, or `allowed` false, asks for nothing. */
export const shiftRoleOptionsQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	allowed = true
): UndefinedInitialDataOptions<
	Array<ShiftRole>,
	Error,
	Array<ShiftRole>,
	ReturnType<typeof shiftRoleOptionsKey>
> =>
	queryOptions({
		queryKey: shiftRoleOptionsKey(companyId, unit?.departmentId ?? ""),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<Array<ShiftRole>> =>
						fetchShiftRoleOptions(companyId, unit, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** The groups the shifts belong to, once each, in the order first met. */
export const groupsOf = (shifts: Array<{ group: string }>): Array<string> => [
	...new Set(shifts.map((shift) => shift.group)),
];
