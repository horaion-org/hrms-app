import type { TFunction } from "i18next";
import type { AccessRole } from "@/features/organisation/api";
import type { Workspace } from "@/features/workspace/api";
import {
	type AssignableScope,
	incompatibleKeys,
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";
import {
	branchScope,
	COMPANY_SCOPE,
	departmentScope,
	type CanAt,
	type ScopeRef,
} from "@/features/workspace/scopes";

/** A place an access role can apply: the whole company, a Branch, or a Department. */
export type AssignmentTarget = {
	label: string;
	branchId?: string;
	departmentId?: string;
};

/** Identifies a place: its Department, else its Branch, else the whole company. */
export const placeKey = (place: {
	branchId?: string;
	departmentId?: string;
}): string => place.departmentId ?? place.branchId ?? "";

/** A place in words: the whole company, a Branch, or a Branch and its Department. */
export const placeOf = (
	place: { branchName?: string; departmentName?: string },
	t: TFunction
): string => {
	if (!place.branchName)
		return t("organisation.accessRoles.assignments.wholeCompany");
	if (!place.departmentName) return place.branchName;
	return t("organisation.accessRoles.assignments.department", {
		branch: place.branchName,
		department: place.departmentName,
	});
};

/** The target a place stands for: its Department, else its Branch, else the company. */
export const scopeOfPlace = (place: {
	branchId?: string;
	departmentId?: string;
}): ScopeRef => {
	if (place.departmentId) return departmentScope(place.departmentId);
	if (place.branchId) return branchScope(place.branchId);
	return COMPANY_SCOPE;
};

const LEVELS: Record<ScopeRef["kind"], AssignableScope> = {
	company: "COMPANY",
	branch: "BRANCH",
	department: "DEPARTMENT",
};

/** The level a target sits at, as the permission contract names it. */
export const levelOf = (target: ScopeRef): AssignableScope =>
	LEVELS[target.kind];

/**
 * Whether a role can be assigned at a target: every key it holds is
 * assignable at the target's level (the contract's `assignableScopes`).
 * Keys this app doesn't know are left to the API, which names them if it
 * refuses.
 */
export const roleFitsScope = (
	role: Pick<AccessRole, "permissions">,
	target: ScopeRef
): boolean => incompatibleKeys(role.permissions, levelOf(target)).length === 0;

/**
 * The keys that keep `role` from fitting any of `targets`, in catalogue
 * order: empty when it fits at least one, or when there is no target.
 */
export const keysThatFitNowhere = (
	role: Pick<AccessRole, "permissions">,
	targets: ReadonlyArray<{ branchId?: string; departmentId?: string }>
): Array<PermissionKey> => {
	const scopes = targets.map(scopeOfPlace);
	if (scopes.some((target) => roleFitsScope(role, target))) return [];
	const misfits = new Set(
		scopes.flatMap((target) =>
			incompatibleKeys(role.permissions, levelOf(target))
		)
	);
	return PERMISSION_KEYS.filter((key) => misfits.has(key));
};

/**
 * The places the person may give a role at, widest first: the company, then
 * each ACTIVE Branch followed by its ACTIVE Departments, keeping only those
 * where `access_role:assign` is effective (the API also needs every key of
 * the role there). Whether a chosen role fits each place is the dialog's
 * part (`roleFitsScope`). Built from the workspace, so choosing a place
 * never needs `branch:read` or `department:read`; a Department's Branch name
 * is a label only, not authority at the Branch.
 */
export const assignmentTargets = (
	workspace: Workspace | undefined,
	companyId: string,
	can: CanAt,
	t: TFunction
): Array<AssignmentTarget> => {
	const company = workspace?.companies.find((item) => item.uuid === companyId);
	if (!company) return [];
	const allowed = (target: ScopeRef): boolean =>
		can("access_role:assign", target);
	const branches = company.branches.filter(
		(branch) => branch.status === "ACTIVE"
	);
	return [
		...(allowed(COMPANY_SCOPE) ? [{ label: placeOf({}, t) }] : []),
		...branches.flatMap((branch) => [
			...(allowed(branchScope(branch.uuid))
				? [{ label: branch.name, branchId: branch.uuid }]
				: []),
			...branch.departments
				.filter(
					(department) =>
						department.status === "ACTIVE" &&
						allowed(departmentScope(department.uuid))
				)
				.map((department) => ({
					label: placeOf(
						{ branchName: branch.name, departmentName: department.name },
						t
					),
					branchId: branch.uuid,
					departmentId: department.uuid,
				})),
		]),
	];
};
