import type { AccessRole } from "@/features/organisation/api";

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
