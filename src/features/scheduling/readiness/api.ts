import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	SCHEDULING_QUERY_ROOT,
	schedulingReadinessPath,
} from "@/features/scheduling/paths";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import type { UnitSelection } from "@/features/workspace/unitSelection";

/*
 * The readiness read (ADR-0071 in the API): for each department in reach,
 * whether a schedule could roster anyone there now, and what it lacks. The
 * API owns the rule; the app only shows its answer.
 */

/** What a department lacks before a schedule could roster anyone, in checklist order. */
export const readinessGapSchema = z.enum(["SHIFT", "STAFFING_CONSTRAINT"]);

/** One gap: no live shift, or no staffing constraint asking for people on one. */
export type ReadinessGap = z.infer<typeof readinessGapSchema>;

export const schedulingReadinessSchema = z.object({
	departmentId: z.string(),
	departmentName: z.string(),
	branchId: z.string(),
	branchName: z.string(),
	/** True exactly when nothing is missing. */
	ready: z.boolean(),
	missing: z.array(readinessGapSchema),
});

/** Whether one department is ready to schedule, as the API answers it. */
export type SchedulingReadiness = z.infer<typeof schedulingReadinessSchema>;

const schedulingReadinessListSchema = z.array(schedulingReadinessSchema);

/**
 * Whether each department in the chosen units is ready to schedule; only the
 * departments where the person may create schedules are answered.
 */
export const fetchSchedulingReadiness = (
	companyId: string,
	units: UnitSelection,
	signal?: AbortSignal
): Promise<Array<SchedulingReadiness>> => {
	const search = new URLSearchParams();
	if (units.branchId) search.set("branchId", units.branchId);
	if (units.departmentId) search.set("departmentId", units.departmentId);
	const query = search.size > 0 ? `?${search.toString()}` : "";
	return apiRequest(
		`${schedulingReadinessPath(companyId)}${query}`,
		schedulingReadinessListSchema,
		{ signal }
	);
};

/** The key readiness in the chosen units is cached under; a shift or constraint save reloads it. */
export const schedulingReadinessKey = (
	companyId: string,
	units: UnitSelection
): readonly ["scheduling", string, "readiness", UnitSelection] =>
	[SCHEDULING_QUERY_ROOT, companyId, "readiness", units] as const;

/** Readiness in the chosen units; `allowed` false asks for nothing. */
export const schedulingReadinessQuery = (
	companyId: string,
	units: UnitSelection,
	allowed = true
): QueryOptionsFor<
	Array<SchedulingReadiness>,
	ReturnType<typeof schedulingReadinessKey>
> =>
	queryOptions({
		queryKey: schedulingReadinessKey(companyId, units),
		queryFn: allowed
			? ({ signal }): Promise<Array<SchedulingReadiness>> =>
					fetchSchedulingReadiness(companyId, units, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
