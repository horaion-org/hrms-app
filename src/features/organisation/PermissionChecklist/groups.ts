import {
	PERMISSION_KEYS,
	PERMISSION_MODULES,
	type PermissionKey,
	type PermissionModule,
	type PermissionResource,
	resourceOf,
} from "@/features/workspace/permissionKeys";

type LabelKeyOf<K> = K extends `${infer R}:${infer A}`
	? `organisation.permissions.${R}.actions.${A}`
	: never;

export type { PermissionResource };

/** One resource's keys, in the catalog's order. */
export type PermissionGroup = {
	module: PermissionModule;
	resource: PermissionResource;
	keys: ReadonlyArray<PermissionKey>;
};

/**
 * The catalog grouped by resource, Module by Module, and in the catalog's
 * order within each Module.
 */
const CATALOG_RESOURCES = [...new Set(PERMISSION_KEYS.map(resourceOf))];

export const PERMISSION_GROUPS: ReadonlyArray<PermissionGroup> =
	PERMISSION_MODULES.flatMap((entry) => {
		const resources: ReadonlyArray<PermissionResource> = entry.resources;
		return CATALOG_RESOURCES.filter((resource) =>
			resources.includes(resource)
		).map((resource) => ({
			module: entry.module,
			resource,
			keys: PERMISSION_KEYS.filter((key) => resourceOf(key) === resource),
		}));
	});

/** The translation key of a permission's label; a key without copy fails to compile. */
export const labelKeyOf = (key: PermissionKey): LabelKeyOf<PermissionKey> =>
	`organisation.permissions.${key.replace(":", ".actions.")}` as LabelKeyOf<PermissionKey>;

/** `selected` with `keys` added or removed, in the catalog's order. */
const withKeys = (
	selected: ReadonlyArray<PermissionKey>,
	keys: ReadonlyArray<PermissionKey>,
	checked: boolean
): Array<PermissionKey> =>
	PERMISSION_KEYS.filter((key) =>
		keys.includes(key) ? checked : selected.includes(key)
	);

/** The selection after ticking or clearing every permission of one resource. */
export const toggleGroup = (
	selected: ReadonlyArray<PermissionKey>,
	group: PermissionGroup,
	checked: boolean
): Array<PermissionKey> => withKeys(selected, group.keys, checked);

/**
 * The selection after ticking or clearing one permission. Ticking anything
 * also ticks the resource's view permission, and clearing view clears the
 * whole resource, so a role can't be given a change it can't see.
 */
export const togglePermission = (
	selected: ReadonlyArray<PermissionKey>,
	key: PermissionKey,
	checked: boolean
): Array<PermissionKey> => {
	const resource = PERMISSION_KEYS.filter(
		(candidate) => resourceOf(candidate) === resourceOf(key)
	);
	const view = resource.find((candidate) => candidate.endsWith(":read"));
	if (key === view && !checked) return withKeys(selected, resource, false);
	return withKeys(selected, checked && view ? [key, view] : [key], checked);
};
