import type { Workspace } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";

/**
 * Where a permission is asked: the company itself, one Branch, or one
 * Department. Always named explicitly; there is no "company unless a unit
 * is given" default, so a missing id can never widen a question.
 */
export type ScopeRef =
	| { kind: "company" }
	| { kind: "branch"; id: string }
	| { kind: "department"; id: string };

/** The company itself, as a target. */
export const COMPANY_SCOPE: ScopeRef = { kind: "company" };

export const branchScope = (id: string): ScopeRef => ({ kind: "branch", id });

export const departmentScope = (id: string): ScopeRef => ({
	kind: "department",
	id,
});

/**
 * Where a record filed at an optional Department is authorised: at that
 * Department, or at the company when it has none (an unassigned member, a
 * leave request of one). This is the API's rule for member records.
 */
export const recordScope = (
	departmentId: string | null | undefined
): ScopeRef => (departmentId ? departmentScope(departmentId) : COMPANY_SCOPE);

/**
 * The effective permissions of one company, indexed by target. Each entry is
 * the set the API's workspace rule resolved for that node, inheritance
 * already applied: nothing is merged again here.
 */
export type AccessIndex = {
	byTarget: ReadonlyMap<string, ReadonlySet<string>>;
	/** Every key held at some node of the company. */
	anywhere: ReadonlySet<string>;
};

const keyOf = (target: ScopeRef): string =>
	target.kind === "company" ? "company" : `${target.kind}:${target.id}`;

/** An index that answers no to everything: no workspace, or no such company. */
export const NO_ACCESS: AccessIndex = {
	byTarget: new Map(),
	anywhere: new Set(),
};

/**
 * Builds the index for one company of the workspace. A company the workspace
 * does not list answers no everywhere.
 */
export const buildAccessIndex = (
	workspace: Workspace,
	companyId: string
): AccessIndex => {
	const company = workspace.companies.find((item) => item.uuid === companyId);
	if (!company) return NO_ACCESS;
	const byTarget = new Map<string, ReadonlySet<string>>();
	const anywhere = new Set<string>();
	const put = (target: ScopeRef, permissions: ReadonlyArray<string>): void => {
		byTarget.set(keyOf(target), new Set(permissions));
		for (const permission of permissions) anywhere.add(permission);
	};
	put(COMPANY_SCOPE, company.permissions);
	for (const branch of company.branches) {
		put(branchScope(branch.uuid), branch.permissions);
		for (const department of branch.departments)
			put(departmentScope(department.uuid), department.permissions);
	}
	return { byTarget, anywhere };
};

const cache = new WeakMap<Workspace, Map<string, AccessIndex>>();

/**
 * `buildAccessIndex`, memoised per workspace response and company, so every
 * component, route guard and hook asking about the same data shares one
 * index. A new workspace response is a new object and builds afresh.
 */
export const accessIndexOf = (
	workspace: Workspace | undefined,
	companyId: string
): AccessIndex => {
	if (!workspace) return NO_ACCESS;
	let byCompany = cache.get(workspace);
	if (!byCompany) {
		byCompany = new Map();
		cache.set(workspace, byCompany);
	}
	let index = byCompany.get(companyId);
	if (!index) {
		index = buildAccessIndex(workspace, companyId);
		byCompany.set(companyId, index);
	}
	return index;
};

/**
 * Whether the key is effective at exactly this target. A unit the workspace
 * does not list answers false; it never falls back to the company.
 */
export const canAt = (
	index: AccessIndex,
	permission: PermissionKey,
	target: ScopeRef
): boolean => index.byTarget.get(keyOf(target))?.has(permission) ?? false;

/** Whether the key is held at any node of the company, e.g. to offer a Module. */
export const canAnywhere = (
	index: AccessIndex,
	permission: PermissionKey
): boolean => index.anywhere.has(permission);

/** Asks at one target, or with `"anywhere"` at any node of the company. */
export type AccessTarget = ScopeRef | "anywhere";

const holds = (
	index: AccessIndex,
	permission: PermissionKey,
	target: AccessTarget
): boolean =>
	target === "anywhere"
		? canAnywhere(index, permission)
		: canAt(index, permission, target);

/** Whether at least one of the keys holds at the target: alternatives. */
export const canAny = (
	index: AccessIndex,
	permissions: ReadonlyArray<PermissionKey>,
	target: AccessTarget
): boolean =>
	permissions.some((permission) => holds(index, permission, target));

/** Whether every key holds at the target: prerequisites, e.g. read and update together. */
export const canAll = (
	index: AccessIndex,
	permissions: ReadonlyArray<PermissionKey>,
	target: AccessTarget
): boolean =>
	permissions.length > 0 &&
	permissions.every((permission) => holds(index, permission, target));

/**
 * Every node's effective permissions per company, as a comparable map: the
 * access-refresh coordinator diffs two of these to find a grant that shrank.
 */
export const effectivePermissionMap = (
	workspace: Workspace
): Map<string, Map<string, ReadonlySet<string>>> =>
	new Map(
		workspace.companies.map((company) => [
			company.uuid,
			new Map(buildAccessIndex(workspace, company.uuid).byTarget),
		])
	);

/** Asks whether a key is effective at a target, as `useAccess().can` does. */
export type CanAt = (permission: PermissionKey, target: ScopeRef) => boolean;

const NONE: ReadonlySet<string> = new Set();

/**
 * Every key effective at exactly this target, for permission-set arithmetic
 * such as the role editor's subset rule. To gate a control, use `canAt`.
 */
export const effectiveAt = (
	index: AccessIndex,
	target: ScopeRef
): ReadonlySet<string> => index.byTarget.get(keyOf(target)) ?? NONE;
