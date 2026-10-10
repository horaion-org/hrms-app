/**
 * The API's permission catalog as `resource:action` keys, in the API's own
 * order. The catalog is code-versioned on the API and has no endpoint, so
 * this is the app's copy of that contract: a key that is not here cannot be
 * asked about, and a typo fails to compile.
 */
export const PERMISSION_KEYS = [
	"company:read",
	"company:update",
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
	"member_profile:read",
	"member_profile:create",
	"member_profile:update",
	"member_note:read",
	"member_note:create",
	"member_note:update",
	"member_note:delete",
	"leave_request:read",
	"leave_request:create",
	"leave_request:review",
	"access_role:read",
	"access_role:create",
	"access_role:update",
	"access_role:delete",
	"access_role:assign",
	"audit_event:read",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/** The resource half of a permission key, e.g. `branch`. */
export type PermissionResource = PermissionKey extends `${infer R}:${string}`
	? R
	: never;

export const resourceOf = (key: PermissionKey): PermissionResource =>
	key.split(":")[0] as PermissionResource;

/**
 * Which Module each resource of the catalog belongs to, in the order the
 * permission checklist shows them. Every resource is in exactly one Module.
 * Company is not a Module of the main navigation, but its permissions are
 * listed under it so that nothing in the catalog goes unplaced.
 */
export const PERMISSION_MODULES = [
	{ module: "people", resources: ["member_profile", "member_note"] },
	{ module: "leave", resources: ["leave_request"] },
	{
		module: "organisation",
		resources: [
			"branch",
			"branch_member",
			"department",
			"department_member",
			"job_title",
			"access_role",
			"audit_event",
		],
	},
	{ module: "company", resources: ["company"] },
] as const satisfies ReadonlyArray<{
	module: string;
	resources: ReadonlyArray<PermissionResource>;
}>;

export type PermissionModule = (typeof PERMISSION_MODULES)[number]["module"];

/** The view keys of a Module's resources, in the catalog's order. */
export const moduleReadKeys = (
	module: PermissionModule
): Array<PermissionKey> => {
	const resources: ReadonlyArray<PermissionResource> =
		PERMISSION_MODULES.find((entry) => entry.module === module)?.resources ??
		[];
	return PERMISSION_KEYS.filter(
		(key) => key.endsWith(":read") && resources.includes(resourceOf(key))
	);
};

/**
 * Holding any of these, at any scope, is what makes the Organisation Module
 * worth offering. Read keys only: a role that may change what it cannot read
 * is misconfigured, and leaving the Module out is the safe way to fail.
 * Branch and department members are left out: they are reached through
 * their branch or department, so seeing them alone opens nothing.
 */
export const ORGANISATION_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"branch:read",
	"department:read",
	"job_title:read",
	"access_role:read",
	"audit_event:read",
];

/**
 * Holding this at any scope is what makes the People Module worth offering.
 * The API lists only the people in the units where it is held. Notes are
 * left out: they are read on a person's page, so seeing them alone opens
 * nothing.
 */
export const PEOPLE_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"member_profile:read",
];

/**
 * Holding this at any scope is what makes the Leave Module worth offering.
 * The API lists only the requests of people in the units where it is held.
 */
export const LEAVE_READ_KEYS: ReadonlyArray<PermissionKey> =
	moduleReadKeys("leave");

/**
 * What granting a key also needs, so the role can use it: the forms that
 * create or edit a person pick a job title. The API checks each key on its
 * own; the role editor adds these as it ticks, and the role stores them flat.
 * Only view keys may be implied.
 */
export const PERMISSION_IMPLICATIONS = {
	"member_profile:create": ["job_title:read"],
	"member_profile:update": ["job_title:read"],
} satisfies Partial<Record<PermissionKey, ReadonlyArray<PermissionKey>>>;

const IMPLICATIONS: Partial<
	Record<PermissionKey, ReadonlyArray<PermissionKey>>
> = PERMISSION_IMPLICATIONS;

/** `keys` with everything they imply, transitively, in the catalog's order. */
export const withImplied = (
	keys: ReadonlyArray<PermissionKey>
): Array<PermissionKey> => {
	const found = new Set(keys);
	const pending = [...keys];
	for (let key = pending.pop(); key; key = pending.pop())
		for (const implied of IMPLICATIONS[key] ?? [])
			if (!found.has(implied)) {
				found.add(implied);
				pending.push(implied);
			}
	return PERMISSION_KEYS.filter((key) => found.has(key));
};

/** The keys of `held` that imply `key`, in the catalog's order. */
export const impliedBy = (
	key: PermissionKey,
	held: ReadonlyArray<PermissionKey>
): Array<PermissionKey> =>
	PERMISSION_KEYS.filter(
		(candidate) =>
			candidate !== key &&
			held.includes(candidate) &&
			withImplied([candidate]).includes(key)
	);

/** Whether a key the API sent is one this app's copy of the catalog knows. */
export const isPermissionKey = (key: string): key is PermissionKey =>
	(PERMISSION_KEYS as ReadonlyArray<string>).includes(key);
