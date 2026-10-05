import type { PermissionKey } from "@/features/workspace/permissionKeys";
import type { Workspace } from "@/features/workspace/api";

const NOTHING: ReadonlyArray<string> = [];

type Company = Workspace["companies"][number];

const companyOf = (
	workspace: Workspace,
	companyId: string
): Company | undefined =>
	workspace.companies.find((company) => company.uuid === companyId);

/**
 * The permission keys that apply at one scope of a company. A grant reaches
 * everything beneath it, so a Department answers with its own keys, its
 * Branch's and the company's; a Branch with its own and the company's. With
 * no unit named, or one the workspace does not list, only the company's
 * keys apply.
 */
export const permissionsAt = (
	workspace: Workspace,
	companyId: string,
	scopeId?: string
): ReadonlyArray<string> => {
	const company = companyOf(workspace, companyId);
	if (!company) return NOTHING;
	for (const branch of company.branches) {
		if (branch.uuid === scopeId)
			return [...company.permissions, ...branch.permissions];
		const department = branch.departments.find(
			(candidate) => candidate.uuid === scopeId
		);
		if (department)
			return [
				...company.permissions,
				...branch.permissions,
				...department.permissions,
			];
	}
	return company.permissions;
};

/**
 * Whether any of the keys is held at any scope of the company. This decides
 * whether a Module is offered at all: it may be usable somewhere in the tree
 * even when nothing is granted company-wide.
 */
export const holdsAnywhere = (
	workspace: Workspace,
	companyId: string,
	keys: ReadonlyArray<PermissionKey>
): boolean => {
	const company = companyOf(workspace, companyId);
	if (!company) return false;
	const held = (permissions: ReadonlyArray<string>): boolean =>
		keys.some((key) => permissions.includes(key));
	return (
		held(company.permissions) ||
		company.branches.some(
			(branch) =>
				held(branch.permissions) ||
				branch.departments.some((department) => held(department.permissions))
		)
	);
};
