import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	constraintOptionsQuery,
	type ConstraintOptions,
} from "@/features/scheduling/constraints/api";
import type { DepartmentPath } from "@/features/scheduling/paths";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * What the constraint dialog of one Department offers: the constraint types
 * with their fields, and its live shifts and ACTIVE job titles, read under
 * `constraint:read` at the Department. `hidden` when that isn't held, whether
 * the workspace says so up front or the API refuses with a 403.
 */
export type ConstraintOptionsState =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; options: ConstraintOptions };

/** `unit` undefined, or `wanted` false, asks for nothing and stays pending. */
export const useConstraintOptions = (
	companyId: string,
	unit: DepartmentPath | undefined,
	wanted = true
): ConstraintOptionsState => {
	const access = useAccess();
	const allowed =
		unit !== undefined &&
		access.can("constraint:read", departmentScope(unit.departmentId));
	const options = useQuery(
		constraintOptionsQuery(companyId, unit, allowed && wanted)
	);

	if (access.status !== "ready") return { status: access.status };
	if (unit === undefined) return { status: "pending" };
	if (!allowed) return { status: "hidden" };
	if (options.error instanceof ApiProblemError && options.error.status === 403)
		return { status: "hidden" };
	if (options.isError) return { status: "error" };
	if (options.data === undefined) return { status: "pending" };
	return { status: "ready", options: options.data };
};
