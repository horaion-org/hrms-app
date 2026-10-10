import {
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import {
	SCHEDULING_QUERY_ROOT,
	schedulePath,
	schedulesPath,
	type DepartmentPath,
} from "@/features/scheduling/paths";
import { retry } from "@/features/workspace/retry";

/*
 * The schedules API: a department's schedules. A schedule exists as a DRAFT
 * from the moment Setup is completed. It owns its shifts, which are read and
 * changed under their own keys and routes (`shifts/api.ts`). Paths, fields
 * and codes follow §8, §8.6 and §8.7 of
 * `_implementation_docs/2026-10-08_schedule-setup/2026-10-08_hrms-backend-v2-schedule-setup.md`.
 */

const scheduleStatusSchema = z.enum(["DRAFT"]);

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
	createdAt: z.string(),
	updatedAt: z.string(),
});

/** A schedule's setup, as the API answers it; its shifts are read on their own. */
export type Schedule = z.infer<typeof scheduleSchema>;

/** What creating or replacing a schedule's setup sends. */
export type ScheduleBody = {
	name: string;
	periodStart: string;
	includeLeave: boolean;
	allowOpenShifts: boolean;
};

/** Creates a DRAFT schedule for a department from the setup fields. */
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
	scheduleId: string
): Promise<Schedule> =>
	apiRequest(schedulePath(companyId, unit, scheduleId), scheduleSchema);

/** Replaces a DRAFT schedule's setup fields. */
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
	readonly ["scheduling", string, "schedules", string]
> =>
	queryOptions({
		queryKey: scheduleKey(companyId, scheduleId),
		queryFn:
			allowed && unit
				? (): Promise<Schedule> => fetchSchedule(companyId, unit, scheduleId)
				: skipToken,
		staleTime: 30_000,
		retry,
	});
