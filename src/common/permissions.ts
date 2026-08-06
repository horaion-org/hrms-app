import type { PermissionKey } from "@/common/api";

/** Builds the `resource:action` key the catalog and the PDP both speak. */
export function permissionKey(resource: string, action: string): PermissionKey {
	return `${resource}:${action}`;
}

export const PERMISSION = {
	companyRead: "company:read",
	companyDelete: "company:delete",
	memberRead: "member:read",
	memberCreate: "member:create",
	memberUpdate: "member:update",
	memberDeactivate: "member:deactivate",
	roleRead: "role:read",
	roleCreate: "role:create",
	roleUpdate: "role:update",
	roleDelete: "role:delete",
	roleAssign: "role:assign",
} as const;
