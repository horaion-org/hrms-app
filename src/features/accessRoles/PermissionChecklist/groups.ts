import type { TFunction } from "i18next";
import type { AccessRoleKind } from "@/features/organisation/api";
import {
	companyOnlyKeys,
	definitionOf,
	dependingOn,
	isAboveDepartments,
	isCompanyOnly,
	moduleOf,
	PERMISSION_KEYS,
	PERMISSION_MODULES,
	type PermissionKey,
	type PermissionModule,
	type PermissionResource,
	type PermissionUse,
	requiredFor,
	resourceOf,
	usesOf,
} from "@/features/workspace/permissionKeys";

export type { PermissionResource };

type LabelKeyOf<K> = K extends `${infer R}:${infer A}`
	? `organisation.permissions.${R}.actions.${A}`
	: never;

type HintKeyOf<K> = K extends `${infer R}:${infer A}`
	? `organisation.permissions.${R}.actionHints.${A}`
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

const LOCAL_KEYS = PERMISSION_KEYS.filter((key) => !isCompanyOnly(key));

const LOCAL_GROUPS = PERMISSION_GROUPS.map((group) => ({
	...group,
	keys: group.keys.filter((key) => !isCompanyOnly(key)),
})).filter((group) => group.keys.length > 0);

/**
 * The keys a role of `kind` may hold, in the catalog's order: all of them,
 * except the company-only ones for a local role. Every key until a kind is
 * chosen.
 */
export const keysFor = (kind?: AccessRoleKind): ReadonlyArray<PermissionKey> =>
	kind === "LOCAL" ? LOCAL_KEYS : PERMISSION_KEYS;

/**
 * The rows a role of `kind` is edited in: every resource, except that a
 * local role's rows leave out company-only keys and a row left with none
 * is not shown at all.
 */
export const groupsFor = (
	kind?: AccessRoleKind
): ReadonlyArray<PermissionGroup> =>
	kind === "LOCAL" ? LOCAL_GROUPS : PERMISSION_GROUPS;

/** One section of the role editor: a module's resources, in the catalog's order. */
export type PermissionSection = {
	module: PermissionModule;
	groups: ReadonlyArray<PermissionGroup>;
};

/**
 * The rows a role of `kind` is edited in, by module in the contract's
 * order (see `groupsFor`); a module left without rows is not shown.
 */
export const sectionsFor = (
	kind?: AccessRoleKind
): ReadonlyArray<PermissionSection> =>
	PERMISSION_MODULES.map((module) => ({
		module,
		// Every key of a resource shares its module, so any key tells it.
		groups: groupsFor(kind).filter((group) =>
			group.keys.some((key) => moduleOf(key) === module)
		),
	})).filter((section) => section.groups.length > 0);

/**
 * Where a key can be given, as the hint beside it in a role of `kind`. In a
 * local role, a key that can't be given at a Department says so. In a
 * company role nothing is said, since every key applies company-wide. With
 * no kind chosen yet, company-only keys say so.
 */
export const scopeHintOf = (
	key: PermissionKey,
	kind?: AccessRoleKind
): "companyOnly" | "notAtDepartments" | undefined => {
	if (kind === "COMPANY") return undefined;
	if (kind === "LOCAL")
		return isAboveDepartments(key) ? "notAtDepartments" : undefined;
	return isCompanyOnly(key) ? "companyOnly" : undefined;
};

/** The translation key of a permission's label; a key without copy fails to compile. */
export const labelKeyOf = (key: PermissionKey): LabelKeyOf<PermissionKey> =>
	`organisation.permissions.${key.replace(":", ".actions.")}` as LabelKeyOf<PermissionKey>;

/** The translation key of what a permission lets its holder do, in more words; a key without copy fails to compile. */
export const hintKeyOf = (key: PermissionKey): HintKeyOf<PermissionKey> =>
	`organisation.permissions.${key.replace(":", ".actionHints.")}` as HintKeyOf<PermissionKey>;

/**
 * A permission named inside a sentence, quoted, e.g. “See shifts”. Its
 * label already names what it is about, so no resource is added.
 */
export const permissionLabel = (key: PermissionKey, t: TFunction): string =>
	t("organisation.permissions.quoted", { permission: t(labelKeyOf(key)) });

/** Several permissions as one phrase, e.g. “Add shifts” and “Edit shifts”. */
export const permissionList = (
	keys: ReadonlyArray<PermissionKey>,
	t: TFunction,
	language: string
): string =>
	new Intl.ListFormat(language, { type: "conjunction" }).format(
		keys.map((key) => permissionLabel(key, t))
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
 * The selection once the role becomes a role of `kind`. A local role can't
 * hold company-only keys, so they are cleared, with whatever needs them;
 * `removed` names what was cleared, in the catalog's order.
 */
export const selectionForKind = (
	selected: ReadonlyArray<PermissionKey>,
	kind: AccessRoleKind
): { selected: Array<PermissionKey>; removed: Array<PermissionKey> } => {
	if (kind !== "LOCAL") return { selected: [...selected], removed: [] };
	const kept = withKeys(
		selected,
		companyOnlyKeys(selected).flatMap(dependingOn),
		false
	);
	return {
		selected: kept,
		removed: PERMISSION_KEYS.filter(
			(key) => selected.includes(key) && !kept.includes(key)
		),
	};
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
 * with the keys of the group that need it, in catalog order. `everyOther`
 * is set when every key of the group but the prerequisites themselves needs
 * it, so the row can say so once instead of listing them all.
 */
export const dependenciesOf = (
	keys: ReadonlyArray<PermissionKey>
): Array<{
	keys: Array<PermissionKey>;
	prerequisites: ReadonlyArray<PermissionKey>;
	everyOther: boolean;
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
	return [...byPrerequisites.values()].map((entry) => ({
		...entry,
		everyOther:
			entry.keys.length ===
			keys.filter((key) => !entry.prerequisites.includes(key)).length,
	}));
};

/** A key ticked along because another one's screens use it, and which key that was. */
export type TickedAlong = PermissionUse & { by: PermissionKey };

/**
 * The selection a change turned `before` into `after`, with what the keys it
 * added also use (see `PERMISSION_USES`) ticked along with their
 * prerequisites, when they can be ticked; and those uses, with the key that
 * caused each, to say why where it was ticked. Unlike a prerequisite it
 * never works the other way: clearing a used key leaves whatever uses it
 * alone.
 */
export const tickUses = (
	before: ReadonlyArray<PermissionKey>,
	after: ReadonlyArray<PermissionKey>,
	unavailable: ReadonlyArray<PermissionKey> = []
): { selected: Array<PermissionKey>; alsoTicked: Array<TickedAlong> } => {
	let selected = [...after];
	const alsoTicked: Array<TickedAlong> = [];
	const added = after.filter((key) => !before.includes(key));
	// Keys ticked along join `added`, so what they use is ticked too.
	for (const key of added)
		for (const use of usesOf(key)) {
			if (
				selected.includes(use.key) ||
				!canTick(use.key, selected, unavailable)
			)
				continue;
			const next = withKeys(selected, requiredFor(use.key), true);
			added.push(...next.filter((item) => !selected.includes(item)));
			selected = next;
			alsoTicked.push({ ...use, by: key });
		}
	return { selected, alsoTicked };
};

/**
 * What the selected keys among `keys` use that is not selected, once per key
 * and reason, in the order of `keys`: their screens show less without it.
 */
export const missingUses = (
	keys: ReadonlyArray<PermissionKey>,
	selected: ReadonlyArray<PermissionKey>
): Array<PermissionUse> =>
	keys
		.filter((key) => selected.includes(key))
		.flatMap(usesOf)
		.filter(
			(use, index, all) =>
				!selected.includes(use.key) &&
				all.findIndex(
					(other) => other.key === use.key && other.reason === use.reason
				) === index
		);
