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
import {
	placeOf,
	scopeOfPlace,
	type PlaceRef,
} from "@/features/workspace/places";

// pages/CreateSchedule.tsx still imports placeOf from here: open PR #99 edits that page, so this PR
// leaves it alone. Import from features/workspace/places everywhere else; drop this once #99 lands.
export { placeOf };

/** A place an access role can apply: the whole company, a Branch, or a Department. */
export type AssignmentTarget = {
	label: string;
	branchId?: string;
	departmentId?: string;
};

/** Whether the person may change an assignment at `place`: `access_role:assign` at that place. */
export const changeableAt =
	(can: CanAt) =>
	(place: PlaceRef): boolean =>
		can("access_role:assign", scopeOfPlace(place));

const LEVELS: Record<ScopeRef["kind"], AssignableScope> = {
	company: "COMPANY",
	branch: "BRANCH",
	department: "DEPARTMENT",
};

/** The level a target sits at, as the permission contract names it. */
export const levelOf = (target: ScopeRef): AssignableScope =>
	LEVELS[target.kind];

/**
 * Whether a role can be assigned at a target. A company role fits only the
 * whole company. A local role fits where every key it holds is assignable
 * at the target's level (the contract's `assignableScopes`). Keys this app
 * doesn't know are left to the API, which names them if it refuses.
 */
export const roleFitsScope = (
	role: Pick<AccessRole, "kind" | "permissions">,
	target: ScopeRef
): boolean =>
	role.kind === "COMPANY"
		? target.kind === "company"
		: incompatibleKeys(role.permissions, levelOf(target)).length === 0;

/**
 * Whether `role` is a company role and the whole company, the only place
 * it can be given, is not among `targets`: the person can't give it at all.
 */
export const companyRoleOutOfReach = (
	role: Pick<AccessRole, "kind">,
	targets: ReadonlyArray<PlaceRef>
): boolean =>
	role.kind === "COMPANY" &&
	!targets.some((target) => scopeOfPlace(target).kind === "company");

/**
 * The keys that keep a local `role` from fitting any of `targets`, in
 * catalogue order: empty when it fits at least one, or when there is no
 * target. A company role is placed by its kind, not its keys, so nothing
 * is named for it (see `companyRoleOutOfReach`).
 */
export const keysThatFitNowhere = (
	role: Pick<AccessRole, "kind" | "permissions">,
	targets: ReadonlyArray<PlaceRef>
): Array<PermissionKey> => {
	if (role.kind === "COMPANY") return [];
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
