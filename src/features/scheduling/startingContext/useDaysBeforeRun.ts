import { useQuery } from "@tanstack/react-query";
import type { DepartmentPath } from "@/common/companyPath";
import { startingDaysQuery } from "@/features/scheduling/startingContext/api";
import {
	type DayBeforeRun,
	daysBeforeRunOf,
	type DaysBeforeRunState,
} from "@/features/scheduling/startingContext/daysBeforeRun";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** The state of the read as the roster has it: pending while it loads, the days once read, nothing when not asked for or failed. */
export const daysBeforeStateOf = ({
	isLoading,
	data,
}: {
	isLoading: boolean;
	data: Array<DayBeforeRun> | undefined;
}): DaysBeforeRunState | undefined => {
	if (isLoading) return { status: "pending" };
	return data && { status: "ready", days: data };
};

/**
 * A schedule's days before its run, for its roster: read once, under the
 * key the set-up grid uses, and only for someone who may read the
 * Department's schedules (`schedule:read`); never asked for otherwise.
 * A failed read gives nothing, so the roster is as it was without it.
 */
export const useDaysBeforeRun = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string
): DaysBeforeRunState | undefined => {
	const access = useAccess();
	const mayRead =
		unit !== undefined &&
		access.can("schedule:read", departmentScope(unit.departmentId));
	const query = useQuery({
		...startingDaysQuery(companyId, unit, scheduleId, mayRead),
		select: daysBeforeRunOf,
	});
	return daysBeforeStateOf(query);
};
