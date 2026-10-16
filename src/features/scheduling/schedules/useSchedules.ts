import { skipToken, useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import { SCHEDULING_QUERY_ROOT } from "@/features/scheduling/paths";
import {
	fetchSchedules,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import {
	accessiblePreviousData,
	administrativeMeta,
} from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import { useAccess } from "@/features/workspace/useAccess";

type SchedulesState =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; schedules: Array<Schedule> };

export const useSchedules = (companyId: string): SchedulesState => {
	const access = useAccess();
	const allowed = access.canAnywhere("schedule:read");
	const list = useQuery({
		queryKey: [SCHEDULING_QUERY_ROOT, companyId, "list"],
		queryFn: allowed
			? ({ signal }): Promise<Array<Schedule>> =>
					fetchSchedules(companyId, signal)
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
