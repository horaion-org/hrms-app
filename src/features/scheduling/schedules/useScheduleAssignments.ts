import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import type { DepartmentPath } from "@/features/scheduling/paths";
import {
	scheduleAssignmentsQuery,
	type ScheduleAssignment,
} from "@/features/scheduling/schedules/api";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * A generated schedule's roster rows. `hidden` when `schedule:read` isn't
 * held at its Department, whether the workspace says so up front or the API
 * refuses with a 403.
 */
export type AssignmentList =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; items: Array<ScheduleAssignment> };

/**
 * `enabled` false (the schedule isn't GENERATED, so it has no roster yet), or
 * `unit` or `scheduleId` undefined, asks for nothing and stays pending.
 */
export const useScheduleAssignments = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string | undefined,
	enabled: boolean
): AssignmentList => {
	const access = useAccess();
	const allowed =
		unit !== undefined &&
		access.can("schedule:read", departmentScope(unit.departmentId));
	const list = useQuery(
		scheduleAssignmentsQuery(
			companyId,
			unit,
			scheduleId ?? "",
			allowed && enabled && scheduleId !== undefined
		)
	);

	if (access.status !== "ready") return { status: access.status };
	if (unit === undefined || scheduleId === undefined || !enabled)
		return { status: "pending" };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", items: list.data };
};
