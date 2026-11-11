import { skipToken, useQuery } from "@tanstack/react-query";
import type { DepartmentPath } from "@/common/companyPath";
import {
	fetchSchedules,
	schedulesInUnitsKey,
	type Schedule,
} from "@/features/scheduling/schedules/api";
import { draftsUsing, type SetupItem } from "@/features/scheduling/setupReach";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * How many of the department's drafts tick the item, from its schedules,
 * asked only where `schedule:read` is held there. Undefined without the
 * key, or while the schedules load: the copy then says "any drafts".
 */
export const useDraftCount = (
	companyId: string,
	unit: DepartmentPath | undefined,
	item: SetupItem | undefined
): number | undefined => {
	const access = useAccess();
	const allowed =
		unit !== undefined &&
		item !== undefined &&
		access.can("schedule:read", departmentScope(unit.departmentId));
	const units = { branchId: unit?.branchId, departmentId: unit?.departmentId };
	const schedules = useQuery({
		queryKey: schedulesInUnitsKey(companyId, units),
		queryFn: allowed
			? ({ signal }): Promise<Array<Schedule>> =>
					fetchSchedules(companyId, units, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		retry,
	}).data;
	return allowed && item && schedules
		? draftsUsing(schedules, item)
		: undefined;
};
