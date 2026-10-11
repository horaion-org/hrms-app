import type { UnitStatus } from "@/features/organisation/api";
import type { Workspace } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import {
	accessIndexOf,
	branchScope,
	canAny,
	departmentScope,
} from "@/features/workspace/scopes";

/** A Branch a page may be narrowed to, as a selector offers it. */
export type BranchChoice = {
	branchId: string;
	name: string;
	country: string;
	status: UnitStatus;
};

/** Narrows choices to ACTIVE units, for selectors used to create or assign. */
export type UnitChoiceOptions = { activeOnly?: boolean };

/**
 * The Branches of a company where any of `keys` is effective at the Branch
 * or at a Department beneath it. Each node's permissions are already
 * effective (a company grant appears on every Branch), so nothing is merged
 * here. A Department-only grant offers its parent Branch for navigation
 * only: it is not authority at the Branch. Sorted by country code, then name.
 * Only units the workspace lists are offered, so a page never needs
 * `branch:read` to choose among them. With `activeOnly`, only ACTIVE
 * Branches are offered.
 */
export const branchChoices = (
	workspace: Workspace,
	companyId: string,
	keys: ReadonlyArray<PermissionKey>,
	{ activeOnly = false }: UnitChoiceOptions = {}
): Array<BranchChoice> => {
	const company = workspace.companies.find(
		(candidate) => candidate.uuid === companyId
	);
	if (!company) return [];
	const index = accessIndexOf(workspace, companyId);
	return company.branches
		.filter((branch) => !activeOnly || branch.status === "ACTIVE")
		.filter(
			(branch) =>
				canAny(index, keys, branchScope(branch.uuid)) ||
				branch.departments.some((department) =>
					canAny(index, keys, departmentScope(department.uuid))
				)
		)
		.map(({ uuid, name, country, status }) => ({
			branchId: uuid,
			name,
			country,
			status,
		}))
		.sort(
			(first, second) =>
				first.country.localeCompare(second.country) ||
				first.name.localeCompare(second.name)
		);
};

/**
 * The offered Branch named by `branchId`. Otherwise the first offered, or
 * with `allowAll` none, which stands for every Branch in reach.
 */
export const chosenBranch = (
	choices: ReadonlyArray<BranchChoice>,
	branchId: string | undefined,
	allowAll = false
): BranchChoice | undefined =>
	choices.find((choice) => choice.branchId === branchId) ??
	(allowAll ? undefined : choices[0]);

/** A Department a form may place something in, with its Branch, as a selector offers it. */
export type DepartmentChoice = {
	departmentId: string;
	name: string;
	branchId: string;
	branchName: string;
	country: string;
	status: UnitStatus;
};

/**
 * The Departments of a company where any of `keys` is effective at the
 * Department itself (its node already carries grants made at its Branch or
 * the company). Sorted by country code, then Branch name, then name. Only units the
 * workspace lists are offered, so a page never needs `department:read` to
 * choose among them. With `activeOnly`, a Department is offered only when
 * it and its Branch are ACTIVE.
 */
export const departmentChoices = (
	workspace: Workspace,
	companyId: string,
	keys: ReadonlyArray<PermissionKey>,
	{ activeOnly = false }: UnitChoiceOptions = {}
): Array<DepartmentChoice> => {
	const company = workspace.companies.find(
		(candidate) => candidate.uuid === companyId
	);
	if (!company) return [];
	const index = accessIndexOf(workspace, companyId);
	return company.branches
		.filter((branch) => !activeOnly || branch.status === "ACTIVE")
		.flatMap((branch) =>
			branch.departments
				.filter((department) => !activeOnly || department.status === "ACTIVE")
				.filter((department) =>
					canAny(index, keys, departmentScope(department.uuid))
				)
				.map((department) => ({
					departmentId: department.uuid,
					name: department.name,
					branchId: branch.uuid,
					branchName: branch.name,
					country: branch.country,
					status: department.status,
				}))
		)
		.sort(
			(first, second) =>
				first.country.localeCompare(second.country) ||
				first.branchName.localeCompare(second.branchName) ||
				first.name.localeCompare(second.name)
		);
};
