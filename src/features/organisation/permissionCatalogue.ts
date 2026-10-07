/**
 * A copy of the API's permission catalogue (`PermissionCatalog`), in its
 * order. The API owns the list and rejects keys outside it, so a drifted copy
 * fails loudly with INVALID_ACCESS_ROLE_PERMISSIONS rather than silently.
 */
export const PERMISSION_CATALOGUE = [
	{ resource: "company", actions: ["read", "update"] },
	{ resource: "branch", actions: ["read", "create", "update"] },
	{
		resource: "branch_member",
		actions: ["read", "create", "update", "deactivate"],
	},
	{ resource: "department", actions: ["read", "create", "update"] },
	{
		resource: "department_member",
		actions: ["read", "create", "update", "deactivate"],
	},
	{ resource: "job_title", actions: ["read", "create", "update"] },
	{
		resource: "access_role",
		actions: ["read", "create", "update", "delete", "assign"],
	},
	{ resource: "audit_event", actions: ["read"] },
] as const;

export type PermissionResource =
	(typeof PERMISSION_CATALOGUE)[number]["resource"];

/** Every action any resource supports, in column order. */
export const PERMISSION_ACTIONS = [
	"read",
	"create",
	"update",
	"deactivate",
	"delete",
	"assign",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const permissionKey = (
	resource: PermissionResource,
	action: PermissionAction
): string => `${resource}:${action}`;

/** Every catalogue key, in catalogue order. */
export const PERMISSION_KEYS: ReadonlyArray<string> =
	PERMISSION_CATALOGUE.flatMap(({ resource, actions }) =>
		actions.map((action) => permissionKey(resource, action))
	);

/** Orders keys as the catalogue lists them, dropping any it doesn't hold. */
export const inCatalogueOrder = (keys: Iterable<string>): Array<string> => {
	const wanted = new Set(keys);
	return PERMISSION_KEYS.filter((key) => wanted.has(key));
};
