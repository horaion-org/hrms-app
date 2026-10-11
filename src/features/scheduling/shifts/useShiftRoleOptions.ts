import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import type { DepartmentPath } from "@/features/scheduling/paths";
import {
	shiftRoleOptionsQuery,
	type ShiftRole,
} from "@/features/scheduling/shifts/api";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * The roles a shift of one Department may apply to: its ACTIVE job titles,
 * read under `shift:read` at the Department. `hidden` when that isn't held,
 * whether the workspace says so up front or the API refuses with a 403.
 */
export type ShiftRoleOptions =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; items: Array<ShiftRole> };

/** `unit` undefined, or `wanted` false, asks for nothing and stays pending. */
export const useShiftRoleOptions = (
	companyId: string,
	unit: DepartmentPath | undefined,
	wanted = true
): ShiftRoleOptions => {
	const access = useAccess();
	const allowed =
		unit !== undefined &&
		access.can("shift:read", departmentScope(unit.departmentId));
	const options = useQuery(
		shiftRoleOptionsQuery(companyId, unit, allowed && wanted)
	);

	if (access.status !== "ready") return { status: access.status };
	if (unit === undefined) return { status: "pending" };
	if (!allowed) return { status: "hidden" };
	if (options.error instanceof ApiProblemError && options.error.status === 403)
		return { status: "hidden" };
	if (options.isError) return { status: "error" };
	if (options.data === undefined) return { status: "pending" };
	return { status: "ready", items: options.data };
};
