/**
 * The API's permission catalog as `resource:action` keys, in the API's own
 * order. The catalog is code-versioned on the API and has no endpoint, so
 * this is the app's copy of that contract: a key that is not here cannot be
 * asked about, and a typo fails to compile.
 */
export const PERMISSION_KEYS = [
	"company:read",
	"company:update",
	"company_member:read",
	"branch:read",
	"branch:create",
	"branch:update",
	"branch_member:read",
	"branch_member:create",
	"branch_member:update",
	"branch_member:deactivate",
	"department:read",
	"department:create",
	"department:update",
	"department_member:read",
	"department_member:create",
	"department_member:update",
	"department_member:deactivate",
	"job_title:read",
	"job_title:create",
	"job_title:update",
	"access_role:read",
	"access_role:create",
	"access_role:update",
	"access_role:delete",
	"access_role:assign",
	"audit_event:read",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/**
 * Holding any of these, at any scope, is what makes the Organisation Module
 * worth offering. Read keys only: a role that may change what it cannot read
 * is misconfigured, and leaving the Module out is the safe way to fail.
 */
export const ORGANISATION_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"branch:read",
	"department:read",
	"job_title:read",
	"access_role:read",
	"audit_event:read",
];

/** Whether a key the API sent is one this app's copy of the catalog knows. */
export const isPermissionKey = (key: string): key is PermissionKey =>
	(PERMISSION_KEYS as ReadonlyArray<string>).includes(key);
