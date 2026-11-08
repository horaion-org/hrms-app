import {
	queryOptions,
	type UnusedSkipTokenOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { companyPath } from "@/features/organisation/api";
import { SCHEDULING_QUERY_ROOT } from "@/features/scheduling/paths";
import { scheduleAssignmentSchema } from "@/features/scheduling/schedules/api";
import { selfMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * A member's own view of a published roster they are on, read under `/me`
 * without `schedule:read`. The API admits only a published schedule of the
 * company that rosters the caller, and answers 404 for anything else.
 */

const myRosterSchema = z.object({
	scheduleId: z.string(),
	name: z.string(),
	branchName: z.string(),
	departmentName: z.string(),
	/** The IANA zone of the branch, which the roster's days are in. */
	timeZone: z.string(),
	/** ISO dates; the period starts on a Monday. */
	periodStart: z.string(),
	periodEnd: z.string(),
	/** Every member's days, as the manager's roster reads them. */
	assignments: z.array(scheduleAssignmentSchema),
});

/** A published schedule's week and department, with its whole roster. */
export type MyRoster = z.infer<typeof myRosterSchema>;

/** The member's own roster route for one schedule. */
export const myRosterPath = (companyId: string, scheduleId: string): string =>
	`${companyPath(companyId)}/me/schedules/${encodeURIComponent(scheduleId)}`;

export const fetchMyRoster = (
	companyId: string,
	scheduleId: string,
	signal?: AbortSignal
): Promise<MyRoster> =>
	apiRequest(myRosterPath(companyId, scheduleId), myRosterSchema, { signal });

/** The key the caller's own view of one roster is cached under. */
export const myRosterKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "me", string] =>
	[SCHEDULING_QUERY_ROOT, companyId, "me", scheduleId] as const;

/** One published roster the caller is on; a 404 is final and not retried. */
export const myRosterQuery = (
	companyId: string,
	scheduleId: string
): UnusedSkipTokenOptions<
	MyRoster,
	Error,
	MyRoster,
	ReturnType<typeof myRosterKey>
> =>
	queryOptions({
		queryKey: myRosterKey(companyId, scheduleId),
		queryFn: ({ signal }) => fetchMyRoster(companyId, scheduleId, signal),
		// Own read: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});
