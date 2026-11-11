import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	schedulingReadinessQuery,
	type SchedulingReadiness,
} from "@/features/scheduling/readiness/api";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";
import type { UnitSelection } from "@/features/workspace/unitSelection";

/**
 * Whether the departments in the chosen units are ready to schedule.
 * `hidden` when `schedule:create` isn't held there, whether the workspace
 * says so up front or the API refuses with a 403.
 */
export type SchedulingReadinessRows =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; rows: Array<SchedulingReadiness> };

/**
 * One chosen Department asks where schedules may be created there;
 * otherwise anywhere in the company, which the API narrows to the
 * Departments where `schedule:create` is held. `asked` false asks for
 * nothing, e.g. before the wizard has a department, and reads as hidden.
 */
export const useSchedulingReadiness = (
	companyId: string,
	units: UnitSelection,
	asked = true
): SchedulingReadinessRows => {
	const access = useAccess();
	const allowed =
		asked &&
		(units.departmentId
			? access.can("schedule:create", departmentScope(units.departmentId))
			: access.canAnywhere("schedule:create"));
	const readiness = useQuery(
		schedulingReadinessQuery(companyId, units, allowed)
	);

	if (access.status !== "ready") return { status: access.status };
	if (!allowed) return { status: "hidden" };
	if (
		readiness.error instanceof ApiProblemError &&
		readiness.error.status === 403
	)
		return { status: "hidden" };
	if (readiness.isError) return { status: "error" };
	if (readiness.data === undefined) return { status: "pending" };
	return { status: "ready", rows: readiness.data };
};
