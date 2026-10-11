import type { DepartmentPath } from "@/features/scheduling/paths";
import type { Workspace } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import {
	departmentChoices,
	type UnitChoiceOptions,
} from "@/features/workspace/unitChoices";

/**
 * The Branch and Department a department-scoped route names, for a
 * Department the workspace offers under any of `keys`; undefined for one it
 * does not, so a page never builds a route for a unit out of its reach.
 */
export const departmentUnitOf = (
	workspace: Workspace,
	companyId: string,
	keys: ReadonlyArray<PermissionKey>,
	departmentId: string,
	options: UnitChoiceOptions = {}
): DepartmentPath | undefined => {
	const choice = departmentChoices(workspace, companyId, keys, options).find(
		(candidate) => candidate.departmentId === departmentId
	);
	return choice && { branchId: choice.branchId, departmentId };
};
