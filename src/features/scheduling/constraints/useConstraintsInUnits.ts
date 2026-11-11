import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	companyConstraintsQuery,
	constraintsQuery,
	type DepartmentConstraint,
} from "@/features/scheduling/constraints/api";
import { departmentScope } from "@/features/workspace/scopes";
import type { ResolvedUnitSelection } from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * The live constraints the Constraints tab lists. `hidden` when
 * `constraint:read` isn't held where the units reach, whether the workspace
 * says so up front or the API refuses with a 403.
 */
export type ConstraintsInUnits =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; items: Array<DepartmentConstraint> };

/**
 * One chosen Department reads its own list, the only one that says how each
 * company constraint applies there; otherwise the company's, within the
 * chosen Branch, which the API narrows to the Departments where
 * `constraint:read` is held, company constraints first and once.
 */
export const useConstraintsInUnits = (
	companyId: string,
	units: ResolvedUnitSelection
): ConstraintsInUnits => {
	const access = useAccess();
	const unit = units.department && {
		branchId: units.department.branchId,
		departmentId: units.department.departmentId,
	};
	const allowed = unit
		? access.can("constraint:read", departmentScope(unit.departmentId))
		: access.canAnywhere("constraint:read");
	const departmentConstraints = useQuery(
		constraintsQuery(companyId, unit, allowed)
	);
	const companyConstraints = useQuery(
		companyConstraintsQuery(companyId, units.branch?.branchId, allowed && !unit)
	);
	const list = unit ? departmentConstraints : companyConstraints;

	if (access.status !== "ready") return { status: access.status };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", items: list.data };
};
