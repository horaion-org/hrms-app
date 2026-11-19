import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";
import type { QueryOptionsFor } from "@/common/query-client";
import { coverOfferSchema } from "@/features/scheduling/coverOffers/api";
import {
	deletedSchedulePath,
	SCHEDULING_QUERY_ROOT,
} from "@/features/scheduling/paths";
import {
	scheduleAssignmentSchema,
	scheduleShiftsSchema,
} from "@/features/scheduling/schedules/api";
import { deletedScheduleSchema } from "@/features/scheduling/schedules/deletedSchedules";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import { useAccess } from "@/features/workspace/useAccess";

/*
 * One deleted schedule as a record: the schedule as it was, its deletion,
 * and its frozen shifts, roster rows and cover offers in the shapes the live
 * reads serve. It sits in an area of its own because it reads both the
 * schedules and the cover offers areas. The answer's `changes` and
 * `withdrawals` are not read yet.
 */

const deletedScheduleRecordSchema = deletedScheduleSchema.and(
	z.object({
		/** The schedule's frozen shifts, which name what its findings refer to. */
		shifts: scheduleShiftsSchema,
		/** The roster as it was when deleted: one row per member per day. */
		assignments: z.array(scheduleAssignmentSchema),
		/**
		 * Every cover offer sent on it, none as an empty list. Null for a reader
		 * who may not read cover offers (no `schedule:edit_shift` at its
		 * Department): the page then leaves that part out.
		 */
		coverOffers: z.array(coverOfferSchema).nullable(),
	})
);

/** A deleted schedule with its roster and cover offers. */
export type DeletedScheduleRecord = z.infer<typeof deletedScheduleRecordSchema>;

/** One deleted schedule by its id alone; the API answers 404 for a live one and for one outside the caller's reach. */
export const fetchDeletedSchedule = (
	companyId: string,
	scheduleId: string,
	signal?: AbortSignal
): Promise<DeletedScheduleRecord> =>
	apiRequest(
		deletedSchedulePath(companyId, scheduleId),
		deletedScheduleRecordSchema,
		{ signal }
	);

/** The key one deleted schedule is cached under; apart from a live schedule's, which no read of this one shares. */
export const deletedScheduleKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "deletedSchedules", string] =>
	[SCHEDULING_QUERY_ROOT, companyId, "deletedSchedules", scheduleId] as const;

/** One deleted schedule; `allowed` false asks for nothing. */
export const deletedScheduleQuery = (
	companyId: string,
	scheduleId: string,
	allowed = true
): QueryOptionsFor<
	DeletedScheduleRecord,
	ReturnType<typeof deletedScheduleKey>
> =>
	queryOptions({
		queryKey: deletedScheduleKey(companyId, scheduleId),
		queryFn: allowed
			? ({ signal }): Promise<DeletedScheduleRecord> =>
					fetchDeletedSchedule(companyId, scheduleId, signal)
			: skipToken,
		// One record: a 404 may mean it moved out of reach.
		meta: administrativeMeta(companyId, { record: true }),
		staleTime: 30_000,
		retry,
	});

/**
 * One deleted schedule. `hidden` when `schedule:read` is held nowhere in the
 * company or the API refuses with a 403; `missing` when the API answers 404:
 * no such deleted schedule, a live one, or one outside the caller's reach.
 */
export type DeletedScheduleState =
	| { status: "pending" | "error" | "hidden" | "missing" }
	| { status: "ready"; schedule: DeletedScheduleRecord };

const refused = (error: unknown, status: number): boolean =>
	error instanceof ApiProblemError && error.status === status;

/** Reads one deleted schedule by its id alone, as `useCompanySchedule` reads a live one. */
export const useDeletedSchedule = (
	companyId: string,
	scheduleId: string
): DeletedScheduleState => {
	const access = useAccess();
	const allowed = access.canAnywhere("schedule:read");
	const record = useQuery(deletedScheduleQuery(companyId, scheduleId, allowed));

	if (access.status !== "ready") return { status: access.status };
	if (!allowed) return { status: "hidden" };
	if (record.data !== undefined)
		return { status: "ready", schedule: record.data };
	if (refused(record.error, 403)) return { status: "hidden" };
	if (refused(record.error, 404)) return { status: "missing" };
	if (record.isError) return { status: "error" };
	return { status: "pending" };
};
