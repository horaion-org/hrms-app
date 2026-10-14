import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import type { DepartmentPath } from "@/features/scheduling/paths";
import {
	scheduleShiftsQuery,
	type ScheduleShift,
} from "@/features/scheduling/schedules/api";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * A schedule's shifts as the steps show them. `hidden` when `shift:read`
 * isn't held at its Department, whether the workspace says so up front or
 * the API refuses with a 403.
 */
export type ShiftList =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; items: Array<ScheduleShift> };

/** `unit` or `scheduleId` undefined asks for nothing and stays pending. */
export const useScheduleShifts = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string | undefined
): ShiftList => {
	const access = useAccess();
	const allowed =
		unit !== undefined &&
		access.can("shift:read", departmentScope(unit.departmentId));
	const list = useQuery(
		scheduleShiftsQuery(
			companyId,
			unit,
			scheduleId ?? "",
			allowed && scheduleId !== undefined
		)
	);

	if (access.status !== "ready") return { status: access.status };
	if (unit === undefined || scheduleId === undefined)
		return { status: "pending" };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", items: list.data };
};
