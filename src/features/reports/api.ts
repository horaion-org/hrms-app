import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	schedulesReadPath,
	searchOf,
	type DayRange,
} from "@/features/dashboard/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import type { UnitSelection } from "@/features/workspace/unitSearch";

/*
 * The one read only Reports shows: how much published rosters changed.
 * Staffing and overtime are the dashboard's reads, which Home shows too.
 */

/** Every Reports query key starts `["reports", companyId, …]`. */
export const REPORTS_QUERY_ROOT = "reports";

/** How long an Reports answer is fresh before it is read again. */
const STALE_TIME_MS = 60_000;

const rosterChangeReasonSchema = z.object({
	/** The change's reason, as the roster's history names it. */
	reason: z.string(),
	changes: z.number().int(),
	days: z.number().int(),
});

/** How often one reason changed published rosters. */
export type RosterChangeReasonCount = z.infer<typeof rosterChangeReasonSchema>;

const rosterChangeDepartmentSchema = z.object({
	branchId: z.string(),
	branchName: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	publishedWeeks: z.number().int(),
	totalChanges: z.number().int(),
	reasons: z.array(rosterChangeReasonSchema),
});

/** One department's changes to its published rosters. */
export type RosterChangeDepartment = z.infer<
	typeof rosterChangeDepartmentSchema
>;

const rosterChangesSchema = z.object({
	from: z.string(),
	to: z.string(),
	departments: z.array(rosterChangeDepartmentSchema),
});

/** The changes to published rosters of the weeks in the range and units. */
export const fetchRosterChanges = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	signal?: AbortSignal
): Promise<Array<RosterChangeDepartment>> =>
	apiRequest(
		`${schedulesReadPath(companyId, "roster-changes")}${searchOf(units, range)}`,
		rosterChangesSchema,
		{ signal }
	).then((answer) => answer.departments);

/** The key one Reports read is cached under. */
const reportsKey = (
	companyId: string,
	read: string,
	units: UnitSelection,
	range: DayRange
): ReadonlyArray<unknown> =>
	[REPORTS_QUERY_ROOT, companyId, read, units, range] as const;

/** Changes to published rosters; `allowed` false asks for nothing. */
export const rosterChangesQuery = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	allowed: boolean
): QueryOptionsFor<Array<RosterChangeDepartment>, ReadonlyArray<unknown>> =>
	queryOptions({
		queryKey: reportsKey(companyId, "rosterChanges", units, range),
		queryFn: allowed
			? ({ signal }): Promise<Array<RosterChangeDepartment>> =>
					fetchRosterChanges(companyId, units, range, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: STALE_TIME_MS,
		retry,
	});
