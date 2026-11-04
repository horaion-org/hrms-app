import { skipToken, useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	fetchSchedules,
	schedulesInUnitsKey,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import {
	accessiblePreviousData,
	administrativeMeta,
} from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import { useAccess } from "@/features/workspace/useAccess";
import type { UnitSelection } from "@/features/workspace/unitSelection";

type SchedulesState =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; schedules: Array<Schedule> };

/** The accessible schedules in the chosen units; every one in scope when none is chosen. */
export const useSchedules = (
	companyId: string,
	units: UnitSelection
): SchedulesState => {
	const access = useAccess();
	const allowed = access.canAnywhere("schedule:read");
	const list = useQuery({
		queryKey: schedulesInUnitsKey(companyId, units),
		queryFn: allowed
			? ({ signal }): Promise<Array<Schedule>> =>
					fetchSchedules(companyId, units, signal)
			: skipToken,
		placeholderData: accessiblePreviousData(),
		meta: administrativeMeta(companyId),
		retry,
	});
	if (access.status !== "ready") return { status: access.status };
	if (
		!allowed ||
		(list.error instanceof ApiProblemError && list.error.status === 403)
	)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", schedules: list.data };
};
