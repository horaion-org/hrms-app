import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";
import {
	SCHEDULING_QUERY_ROOT,
	schedulePath,
	schedulesPath,
	type DepartmentPath,
} from "@/features/scheduling/paths";
import {
	SHIFT_COLOUR_PATTERN,
	shiftRoleSchema,
	weekdaySchema,
} from "@/features/scheduling/shifts/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * The schedules API: a Department's schedules. A schedule exists as a DRAFT
 * from the moment Setup is completed and remembers which of the
 * Department's live shifts are ticked; generating it freezes those shifts
 * into the schedule. Paths, fields and codes follow §2.4 of the API's
 * `docs/implementation/2026-10-11-shifts-module.md`.
 */

const scheduleStatusSchema = z.enum(["DRAFT", "GENERATION_REQUESTED"]);

/** A DRAFT can be changed; once generation is requested it is frozen. */
export type ScheduleStatus = z.infer<typeof scheduleStatusSchema>;

const scheduleSchema = z.object({
	scheduleId: z.string(),
	companyId: z.string(),
	branchId: z.string(),
	branchName: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	name: z.string(),
	/** The Monday the week-long period starts, as an ISO date. */
	periodStart: z.string(),
	/** The Sunday it ends, six days on. */
	periodEnd: z.string(),
	includeLeave: z.boolean(),
	allowOpenShifts: z.boolean(),
	status: scheduleStatusSchema,
	/** A draft's ticked live shifts; once generated, the frozen copies' sources. */
	includedShiftIds: z.array(z.string()),
	/** Set exactly when the status is not DRAFT. */
	generationRequestedAt: z.string().nullable(),
	/** `displayName` is null once the requester has left the company. */
	generationRequestedBy: z
		.object({ membershipId: z.string(), displayName: z.string().nullable() })
		.nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/** A schedule as the API answers it; its shifts are read on their own. */
export type Schedule = z.infer<typeof scheduleSchema>;

/** What creating or replacing a schedule sends: its setup and the ticked live shifts. */
export type ScheduleBody = {
	name: string;
	periodStart: string;
	includeLeave: boolean;
	allowOpenShifts: boolean;
	includedShiftIds: Array<string>;
};

/** Creates a DRAFT schedule for a Department. */
export const createSchedule = (
	companyId: string,
	unit: DepartmentPath,
	body: ScheduleBody
): Promise<Schedule> =>
	apiRequest(schedulesPath(companyId, unit), scheduleSchema, {
		method: "POST",
		body,
	});

export const fetchSchedule = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<Schedule> =>
	apiRequest(schedulePath(companyId, unit, scheduleId), scheduleSchema, {
		signal,
	});

/** Replaces a DRAFT schedule's setup and ticks; the ticks sent are the whole set. */
export const updateSchedule = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	body: ScheduleBody
): Promise<Schedule> =>
	apiRequest(schedulePath(companyId, unit, scheduleId), scheduleSchema, {
		method: "PUT",
		body,
	});

/**
 * Freezes a DRAFT's ticked live shifts into it and marks it
 * GENERATION_REQUESTED. Whatever it answers is not read: the page leaves
 * the schedule and every scheduling query reloads.
 */
export const requestGeneration = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string
): Promise<void> =>
	apiRequestVoid(`${schedulePath(companyId, unit, scheduleId)}/generation`, {
		method: "POST",
	});

const scheduleShiftSchema = z.object({
	/** The live shift while DRAFT; once frozen its source, null when that was deleted. */
	shiftId: z.string().nullable(),
	name: z.string(),
	group: z.string(),
	colour: z.string().regex(SHIFT_COLOUR_PATTERN),
	startTime: z.string(),
	endTime: z.string(),
	days: z.array(weekdaySchema),
	roles: z.array(shiftRoleSchema),
	/** Whether the schedule ticks it. */
	included: z.boolean(),
	/** A copy made at generation, never changed again. */
	frozen: z.boolean(),
});

/**
 * One row of a schedule's shifts: for a DRAFT, one of the Department's live
 * shifts with whether it is ticked; once generated, one frozen copy.
 */
export type ScheduleShift = z.infer<typeof scheduleShiftSchema>;

const scheduleShiftsSchema = z.array(scheduleShiftSchema);

/** A schedule's shifts, ordered by group then name. */
export const fetchScheduleShifts = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<Array<ScheduleShift>> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/shifts`,
		scheduleShiftsSchema,
		{ signal }
	);

/** The key one schedule is cached under, whichever department it is reached through. */
export const scheduleKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string] =>
	[SCHEDULING_QUERY_ROOT, companyId, "schedules", scheduleId] as const;

/** One schedule; `unit` undefined, or `allowed` false, asks for nothing. */
export const scheduleQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed = true
): UndefinedInitialDataOptions<
	Schedule,
	Error,
	Schedule,
	ReturnType<typeof scheduleKey>
> =>
	queryOptions({
		queryKey: scheduleKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<Schedule> =>
						fetchSchedule(companyId, unit, scheduleId, signal)
				: skipToken,
		// One record: a 404 may mean it moved out of reach.
		meta: administrativeMeta(companyId, { record: true }),
		staleTime: 30_000,
		retry,
	});

/** The key a schedule's shifts are cached under, below the schedule's own. */
export const scheduleShiftsKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "schedules", string, "shifts"] =>
	[...scheduleKey(companyId, scheduleId), "shifts"] as const;

/** A schedule's shifts; `unit` undefined, or `allowed` false, asks for nothing. */
export const scheduleShiftsQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	allowed = true
): UndefinedInitialDataOptions<
	Array<ScheduleShift>,
	Error,
	Array<ScheduleShift>,
	ReturnType<typeof scheduleShiftsKey>
> =>
	queryOptions({
		queryKey: scheduleShiftsKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<Array<ScheduleShift>> =>
						fetchScheduleShifts(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
