import { useQuery } from "@tanstack/react-query";
import type { DepartmentPath } from "@/common/companyPath";
import { ApiProblemError } from "@/common/problem";
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
 * The roster of run `runId` at `revision`, as `rosterRunId` and the
 * schedule's `rosterRevision` name it. `runId` undefined (the schedule has no
 * roster to show yet), or `unit` or `scheduleId` undefined, asks for nothing
 * and stays pending. A new run id, or a new revision after a hand change,
 * reads the new rows.
 */
export const useScheduleAssignments = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string | undefined,
	runId: string | null | undefined,
	revision = 0
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
			runId ?? null,
			revision,
			allowed && runId !== undefined && scheduleId !== undefined
		)
	);

	if (access.status !== "ready") return { status: access.status };
	if (unit === undefined || scheduleId === undefined || runId === undefined)
		return { status: "pending" };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", items: list.data };
};
