import type { TFunction } from "i18next";
import {
	definitionOf,
	dependingOn,
	PERMISSION_KEYS,
	type PermissionKey,
	type PermissionResource,
	requiredFor,
	resourceOf,
} from "@/features/workspace/permissionKeys";

export type { PermissionResource };

type LabelKeyOf<K> = K extends `${infer R}:${infer A}`
	? `organisation.permissions.${R}.actions.${A}`
	: never;

/** One resource's keys, in the catalog's order. */
export type PermissionGroup = {
	resource: PermissionResource;
	keys: ReadonlyArray<PermissionKey>;
};

/** The catalog grouped by resource, both in the catalog's order. */
export const PERMISSION_GROUPS: ReadonlyArray<PermissionGroup> = [
	...new Set(PERMISSION_KEYS.map(resourceOf)),
].map((resource) => ({
	resource,
	keys: PERMISSION_KEYS.filter((key) => resourceOf(key) === resource),
}));

/** The translation key of a permission's label; a key without copy fails to compile. */
export const labelKeyOf = (key: PermissionKey): LabelKeyOf<PermissionKey> =>
	`organisation.permissions.${key.replace(":", ".actions.")}` as LabelKeyOf<PermissionKey>;

/**
 * A permission named on its own, e.g. "View", or with its resource when it
 * belongs to another one than `within`, e.g. "Branches: View".
 */
export const permissionLabel = (
	key: PermissionKey,
	t: TFunction,
	within?: PermissionResource
): string => {
	const action = t(labelKeyOf(key));
	const resource = resourceOf(key);
	return resource === within
		? action
		: t("organisation.permissions.qualified", {
				resource: t(`organisation.permissions.${resource}.name`),
				permission: action,
			});
};

/** Several permissions as one phrase, e.g. "Create, Edit, and Delete". */
export const permissionList = (
	keys: ReadonlyArray<PermissionKey>,
	t: TFunction,
	language: string,
	within?: PermissionResource
): string =>
	new Intl.ListFormat(language, { type: "conjunction" }).format(
		keys.map((key) => permissionLabel(key, t, within))
	);

/** `selected` with `keys` added or removed, in the catalog's order. */
const withKeys = (
	selected: ReadonlyArray<PermissionKey>,
	keys: ReadonlyArray<PermissionKey>,
	checked: boolean
): Array<PermissionKey> =>
	PERMISSION_KEYS.filter((key) =>
		keys.includes(key) ? checked : selected.includes(key)
	);

/**
 * The prerequisites of `key` that are not selected and can't be ticked,
 * which is what keeps `key` from being ticked. Empty when it can be.
 */
export const blockedBy = (
	key: PermissionKey,
	selected: ReadonlyArray<PermissionKey>,
	unavailable: ReadonlyArray<PermissionKey>
): Array<PermissionKey> =>
	requiredFor(key).filter(
		(required) =>
			required !== key &&
			!selected.includes(required) &&
			unavailable.includes(required)
	);

/** Whether `key` can be ticked now: it is available, and so is whatever it needs. */
export const canTick = (
	key: PermissionKey,
	selected: ReadonlyArray<PermissionKey>,
	unavailable: ReadonlyArray<PermissionKey>
): boolean =>
	!unavailable.includes(key) &&
	blockedBy(key, selected, unavailable).length === 0;

/**
 * The selection after ticking or clearing one permission, following the
 * contract's prerequisites: ticking a key ticks what it needs, and clearing
 * one clears whatever needs it, so a role can't be given a change it can't
 * see. A permission that can't be ticked is never added.
 */
export const togglePermission = (
	selected: ReadonlyArray<PermissionKey>,
	key: PermissionKey,
	checked: boolean,
	unavailable: ReadonlyArray<PermissionKey> = []
): Array<PermissionKey> => {
	if (!checked) return withKeys(selected, dependingOn(key), false);
	if (!canTick(key, selected, unavailable)) return [...selected];
	return withKeys(selected, requiredFor(key), true);
};

/**
 * The selection after ticking or clearing every permission of one resource,
 * with the same prerequisites as ticking them one by one; keys that can't
 * be ticked are skipped.
 */
export const toggleGroup = (
	selected: ReadonlyArray<PermissionKey>,
	group: PermissionGroup,
	checked: boolean,
	unavailable: ReadonlyArray<PermissionKey> = []
): Array<PermissionKey> =>
	checked
		? withKeys(
				selected,
				group.keys
					.filter((key) => canTick(key, selected, unavailable))
					.flatMap(requiredFor),
				true
			)
		: withKeys(selected, group.keys.flatMap(dependingOn), false);

/**
 * A group's dependencies for display: each distinct set of prerequisites
 * with the keys of the group that need it, in catalog order.
 */
export const dependenciesOf = (
	keys: ReadonlyArray<PermissionKey>
): Array<{
	keys: Array<PermissionKey>;
	prerequisites: ReadonlyArray<PermissionKey>;
}> => {
	const byPrerequisites = new Map<
		string,
		{ keys: Array<PermissionKey>; prerequisites: ReadonlyArray<PermissionKey> }
	>();
	for (const key of keys) {
		const { prerequisites } = definitionOf(key);
		if (prerequisites.length === 0) continue;
		const id = prerequisites.join(",");
		const entry = byPrerequisites.get(id) ?? { keys: [], prerequisites };
		entry.keys.push(key);
		byPrerequisites.set(id, entry);
	}
	return [...byPrerequisites.values()];
};
