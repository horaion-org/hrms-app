import { queryOptions, skipToken } from "@tanstack/react-query";
import { apiRequestVoid } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	SCHEDULING_QUERY_ROOT,
	schedulePath,
} from "@/features/scheduling/paths";
import type { RosterChangeTarget } from "@/features/scheduling/rosterChanges/useRosterChangeActions";
import { administrativeMeta } from "@/features/workspace/queryAccess";

/*
 * The warm-up of the engine's repair worker (the API's `…/repair-warm-up`,
 * hrms-backend-v2 ADR-0086): sent as a manager turns to repair, so the worker
 * has the roster's model cached when they ask for repair options or validate.
 * Fire and forget: the API answers 202 with no body, and nothing is shown.
 */

/** How long one warm-up of a roster holds before the next may be sent: a few minutes, as the worker stays warm. */
export const REPAIR_WARM_UP_WINDOW_MILLISECONDS = 5 * 60 * 1000;

/** Asks the API to warm the engine's repair worker for the roster at `expectedRevision`. */
export const sendRepairWarmUp = (
	{ companyId, unit, scheduleId }: RosterChangeTarget,
	body: { expectedRevision: number },
	signal?: AbortSignal
): Promise<void> =>
	apiRequestVoid(
		`${schedulePath(companyId, unit, scheduleId)}/repair-warm-up`,
		{
			method: "POST",
			body,
			signal,
		}
	);

/**
 * The key a roster's warm-up is remembered under: one per roster, whatever
 * its revision. Not below the schedule's own key, which every landed change
 * invalidates: that would send the warm-up again after each change.
 */
export const repairWarmUpKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "repairWarmUp", string] =>
	[SCHEDULING_QUERY_ROOT, companyId, "repairWarmUp", scheduleId] as const;

/**
 * The roster's warm-up as a query, so the cache sends it at most once per
 * roster in the window, whoever asks for it; only while `wanted`. A failure is
 * swallowed (the answer is `false`): a cold worker only makes the first repair
 * slower, and the manager is shown nothing either way.
 */
export const repairWarmUpQuery = (
	target: RosterChangeTarget,
	revision: number,
	wanted: boolean
): QueryOptionsFor<boolean, ReturnType<typeof repairWarmUpKey>> =>
	queryOptions({
		queryKey: repairWarmUpKey(target.companyId, target.scheduleId),
		queryFn: wanted
			? ({ signal }): Promise<boolean> =>
					sendRepairWarmUp(target, { expectedRevision: revision }, signal).then(
						() => true,
						() => false
					)
			: skipToken,
		meta: administrativeMeta(target.companyId),
		staleTime: REPAIR_WARM_UP_WINDOW_MILLISECONDS,
		gcTime: REPAIR_WARM_UP_WINDOW_MILLISECONDS,
		retry: false,
		refetchOnWindowFocus: false,
	});
