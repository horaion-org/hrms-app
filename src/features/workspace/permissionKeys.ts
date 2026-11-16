import {
	type ASSIGNABLE_SCOPES,
	PERMISSION_DEFINITIONS,
	PERMISSION_KEYS,
	PERMISSION_MODULES,
	type PermissionKey,
} from "@/features/workspace/permissionContract.generated";

/**
 * The API's permission catalogue, read from the module generated from its
 * contract (`contracts/permission-catalog.json`). Every editor, summary, type
 * guard and gate goes through here; nothing else lists permissions.
 */
export {
	PERMISSION_DEFINITIONS,
	PERMISSION_KEYS,
	PERMISSION_MODULES,
	type PermissionKey,
};

/** A level a System role can be assigned at. */
export type AssignableScope = (typeof ASSIGNABLE_SCOPES)[number];

/** The resource half of a permission key, e.g. `branch`. */
export type PermissionResource =
	(typeof PERMISSION_DEFINITIONS)[number]["resource"];

/** A section of the role editor, e.g. `scheduling`, as the contract names it. */
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

/** One permission as the contract defines it, widened for lookups. */
export type PermissionDefinition = {
	key: PermissionKey;
	resource: PermissionResource;
	action: string;
	/** The section of the role editor its resource sits in. */
	module: PermissionModule;
	/** The levels an assignment of a role holding it may be made at. */
	assignableScopes: ReadonlyArray<AssignableScope>;
	/** Keys a role must also hold to hold this one. */
	prerequisites: ReadonlyArray<PermissionKey>;
	/** The day the key reached the product, `YYYY-MM-DD` (ADR-0101). */
	since: string;
	/** Keys this one's screens also read, each with why; never required (ADR-0101). */
	worksWith: ReadonlyArray<{ key: PermissionKey; reason: PermissionUseReason }>;
};

// Widening checks every prerequisite names a known key at compile time.
const DEFINITIONS: ReadonlyArray<PermissionDefinition> = PERMISSION_DEFINITIONS;
const BY_KEY = new Map<string, PermissionDefinition>(
	DEFINITIONS.map((definition) => [definition.key, definition])
);

/**
 * Holding any of these, at any scope, is what makes the Organisation Module
 * worth offering. Read keys only: a role that may change what it cannot read
 * is misconfigured, and leaving the Module out is the safe way to fail.
 */
export const ORGANISATION_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"branch:read",
	"department:read",
	"job_title:read",
	"audit_event:read",
];

/** A Department is listed where this is held: the Departments list's Branch choices. */
export const DEPARTMENT_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"department:read",
];

/** A Job title is listed where this is held at its Department: the Job titles list's unit choices. */
export const JOB_TITLE_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"job_title:read",
];

/**
 * Holding this at any scope is what makes the People Module worth offering.
 * The API lists only the people in the units where it is held.
 */
export const PEOPLE_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"member_profile:read",
];

/**
 * Holding this at any scope is what makes the Leave Module worth offering.
 * The API lists only the requests of people in the units where it is held.
 */
export const LEAVE_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"leave_request:read",
];

/**
 * Holding this at a Department is what lets a person see the work
 * availability of its part-time members, and who of them has none.
 */
export const AVAILABILITY_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"work_availability:read",
];

/**
 * Holding this at any scope is what brings Home's people events into reach:
 * who joins, ends probation or leaves. A key of its own, never
 * `member_profile:read` (hrms-backend-v2 docs/adr/0097).
 */
export const MEMBER_EVENT_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"member_event:read",
];

/** Holding this at a Department is what lets a person see its members' shift preferences. */
export const SHIFT_PREFERENCE_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"shift_preference:read",
];

/** A new schedule may be created where this is held at its Department: the wizard's unit choices. */
export const SCHEDULE_CREATE_KEYS: ReadonlyArray<PermissionKey> = [
	"schedule:create",
];

/** A schedule is listed where this is held at its Department: the Scheduling list's unit choices. */
export const SCHEDULE_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"schedule:read",
];

/**
 * Holding this at any scope is what makes Reports and the overview worth
 * offering. A key of its own, never `schedule:read`: the figures can be given
 * without the rosters (hrms-backend-v2 docs/adr/0097).
 */
export const REPORT_READ_KEYS: ReadonlyArray<PermissionKey> = ["report:read"];

/** A roster's shifts are changed and cover is offered where this is held at its Department: the dashboard's open offers. */
export const SCHEDULE_EDIT_SHIFT_KEYS: ReadonlyArray<PermissionKey> = [
	"schedule:edit_shift",
];

/** Shifts are listed where this is held at their Department: the Shifts tab's unit choices. */
export const SHIFT_READ_KEYS: ReadonlyArray<PermissionKey> = ["shift:read"];

/** Constraints are listed where this is held at their Department: the Constraints tab's unit choices. */
export const CONSTRAINT_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"constraint:read",
];

/**
 * Holding this at a member's Department is what lets a person change that
 * member's work availability. A member's own needs nothing granted.
 */
export const AVAILABILITY_UPDATE_KEY: PermissionKey =
	"work_availability:update";

/**
 * Whether a key the API sent is one this app's contract knows. A key it
 * doesn't know is newer than the app: gates may ignore it, but a role's
 * editor keeps it (see `unknownKeys`).
 */
export const isPermissionKey = (key: string): key is PermissionKey =>
	BY_KEY.has(key);

/** The keys of `keys` this app's contract doesn't know, in their given order. */
export const unknownKeys = (keys: ReadonlyArray<string>): Array<string> =>
	keys.filter((key) => !isPermissionKey(key));

/** A known key's definition. */
export const definitionOf = (key: PermissionKey): PermissionDefinition =>
	BY_KEY.get(key) as PermissionDefinition;

/** The resource half of a permission key, e.g. `branch`. */
export const resourceOf = (key: PermissionKey): PermissionResource =>
	definitionOf(key).resource;

/** The section of the role editor a key's resource sits in, e.g. `scheduling`. */
export const moduleOf = (key: PermissionKey): PermissionModule =>
	definitionOf(key).module;

/** `key` and every key it needs, directly or through another, in catalogue order. */
export const requiredFor = (key: PermissionKey): Array<PermissionKey> => {
	const needed = new Set<PermissionKey>([key]);
	const add = (current: PermissionKey): void => {
		for (const required of definitionOf(current).prerequisites)
			if (!needed.has(required)) {
				needed.add(required);
				add(required);
			}
	};
	add(key);
	return PERMISSION_KEYS.filter((item) => needed.has(item));
};

/** `key` and every key that needs it, directly or through another, in catalogue order. */
export const dependingOn = (key: PermissionKey): Array<PermissionKey> =>
	PERMISSION_KEYS.filter((item) => requiredFor(item).includes(key));

/** Whether a role holding `key` may be assigned at `scope`. */
export const assignableAt = (
	key: PermissionKey,
	scope: AssignableScope
): boolean => definitionOf(key).assignableScopes.includes(scope);

/** Whether `key` can only be given company-wide. */
export const isCompanyOnly = (key: PermissionKey): boolean =>
	definitionOf(key).assignableScopes.every((scope) => scope === "COMPANY");

/**
 * The known keys of `permissions` a role can't carry at `scope`, in
 * catalogue order. Keys this app doesn't know are not judged here: the API
 * decides, and names them if it refuses.
 */
export const incompatibleKeys = (
	permissions: ReadonlyArray<string>,
	scope: AssignableScope
): Array<PermissionKey> =>
	PERMISSION_KEYS.filter(
		(key) => permissions.includes(key) && !assignableAt(key, scope)
	);

/**
 * The known keys of `permissions` that only a company role may hold (see
 * `isCompanyOnly`), in catalogue order. A local role holds none of them.
 */
export const companyOnlyKeys = (
	permissions: ReadonlyArray<string>
): Array<PermissionKey> =>
	PERMISSION_KEYS.filter(
		(key) => permissions.includes(key) && isCompanyOnly(key)
	);

/**
 * Whether `key` can be given at the whole company and at a Branch but not
 * at a Department: a local role holding it can't be given at a Department.
 */
export const isAboveDepartments = (key: PermissionKey): boolean =>
	assignableAt(key, "BRANCH") && !assignableAt(key, "DEPARTMENT");

/** Why a screen of one key reads another, as the contract's reason codes (ADR-0101). */
export type PermissionUseReason =
	(typeof PERMISSION_DEFINITIONS)[number]["worksWith"][number]["reason"];

/** A key another one's screens read, and why. */
export type PermissionUse = { key: PermissionKey; reason: PermissionUseReason };

/**
 * What `key`'s screens read from other resources, as the API's contract
 * declares (`worksWith`, ADR-0101). The API never requires them (a
 * prerequisite is always the same resource), but without one the screen
 * shows less. A role's editor ticks them along and warns when one is missing.
 */
export const usesOf = (key: PermissionKey): ReadonlyArray<PermissionUse> =>
	definitionOf(key).worksWith;
