import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	companyShiftsQuery,
	departmentShiftsQuery,
	type DepartmentShift,
} from "@/features/scheduling/shifts/api";
import { departmentScope } from "@/features/workspace/scopes";
import type { ResolvedUnitSelection } from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * The live shifts the Shifts tab lists. `hidden` when `shift:read` isn't
 * held where the units reach, whether the workspace says so up front or the
 * API refuses with a 403.
 */
export type ShiftsInUnits =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; items: Array<DepartmentShift> };

/**
 * One chosen Department reads its own shifts; otherwise the company's,
 * within the chosen Branch, which the API narrows to the Departments where
 * `shift:read` is held.
 */
export const useShiftsInUnits = (
	companyId: string,
	units: ResolvedUnitSelection
): ShiftsInUnits => {
	const access = useAccess();
	const unit = units.department && {
		branchId: units.department.branchId,
		departmentId: units.department.departmentId,
	};
	const allowed = unit
		? access.can("shift:read", departmentScope(unit.departmentId))
		: access.canAnywhere("shift:read");
	const departmentShifts = useQuery(
		departmentShiftsQuery(companyId, unit, allowed)
	);
	const companyShifts = useQuery(
		companyShiftsQuery(companyId, units.branch?.branchId, allowed && !unit)
	);
	const list = unit ? departmentShifts : companyShifts;

	if (access.status !== "ready") return { status: access.status };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", items: list.data };
};
