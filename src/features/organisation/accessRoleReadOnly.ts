import type {
	AccessRoleAssignmentRow,
	AccessRolePerson,
} from "@/features/organisation/AccessRoleAssignments";
import type { AccessRole, UnitStatus } from "@/features/organisation/api";
import { scopeOfPlace } from "@/features/organisation/assignmentTargets";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import {
	COMPANY_SCOPE,
	type CanAt,
	type ScopeRef,
} from "@/features/workspace/scopes";

/**
 * Why the person can only view a role, or `undefined` when they may change
 * it. A role holding a permission the person doesn't hold is `locked`: the
 * API refuses every change to it, a rename included.
 */
export const readOnlyReason = (
	role: AccessRole,
	held: ReadonlySet<string>
): "protected" | "viewOnly" | "locked" | undefined => {
	if (role.protectedRole) return "protected";
	if (!held.has("access_role:update")) return "viewOnly";
	if (role.permissions.some((permission) => !held.has(permission)))
		return "locked";
	return undefined;
};

/**
 * Whether the person may give, change or remove `role` for anyone (API
 * ADR-0108): never the System Owner role; the System Admin role only with
 * `access_role:assign_system_admin`, which only the System Owner holds; any
 * other role with `access_role:assign` somewhere, which only the System
 * Owner and System Admin hold. Each place is still checked on its own.
 */
export const mayAssignRole = (
	role: AccessRole,
	access: {
		can: (permission: PermissionKey, target: ScopeRef) => boolean;
		canAnywhere: (permission: PermissionKey) => boolean;
	}
): boolean => {
	if (role.protectedRoleType === "SYSTEM_OWNER") return false;
	if (role.protectedRoleType === "SYSTEM_ADMIN")
		return access.can("access_role:assign_system_admin", COMPANY_SCOPE);
	return !role.protectedRole && access.canAnywhere("access_role:assign");
};

/** Which sentence says who can change who holds `role`, for a person who can't. */
export const whoCanAssign = (
	role: AccessRole
): "SYSTEM_OWNER" | "SYSTEM_ADMIN" | "CUSTOM" =>
	role.protectedRoleType ?? "CUSTOM";

/** Whether the person may change one assignment: `access_role:assign` at the assignment's own place. */
export const changeableAt =
	(can: CanAt) =>
	(place: AccessRoleAssignmentRow): boolean =>
		can("access_role:assign", scopeOfPlace(place));

/**
 * A person's row narrowed to the assignments the person may change, with
 * the status those alone add up to. Status and removal act on these only:
 * an assignment out of reach is never touched because it is grouped on the
 * same row.
 */
export const changeablePart = (
	person: AccessRolePerson,
	can: CanAt
): AccessRolePerson => {
	const places = person.places.filter(changeableAt(can));
	const status: UnitStatus = places.some((place) => place.status === "ACTIVE")
		? "ACTIVE"
		: "INACTIVE";
	return { ...person, places, status };
};
