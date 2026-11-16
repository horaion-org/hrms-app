import type { TFunction } from "i18next";
import type { AccessRoleKind } from "@/features/organisation/api";
import {
	AREAS,
	keysOfArea,
	type PermissionArea,
} from "@/features/organisation/permissionAreas";
import {
	keysFor,
	togglePermission,
} from "@/features/organisation/PermissionChecklist/groups";
import {
	definitionOf,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

/**
 * How much of an area a role holds: nothing, every "see" key, every key, or
 * any other mix (`CUSTOM`, never chosen, only shown).
 */
export type AreaLevel = "NONE" | "VIEW" | "MANAGE" | "CUSTOM";

/** One area with the level a set of keys holds there. */
export type AreaWithLevel = { area: PermissionArea; level: AreaLevel };

const isRead = (key: PermissionKey): boolean =>
	definitionOf(key).action === "read";

/** The keys of `area` a role of `kind` may hold, in the catalogue's order. */
export const offeredKeys = (
	area: PermissionArea,
	kind?: AccessRoleKind
): Array<PermissionKey> => {
	const allowed = keysFor(kind);
	return keysOfArea(area).filter((key) => allowed.includes(key));
};

/** The keys a level grants among `offered`: every read for View, every key for Manage. */
export const keysAtLevel = (
	offered: ReadonlyArray<PermissionKey>,
	level: AreaLevel
): Array<PermissionKey> => {
	if (level === "MANAGE") return [...offered];
	if (level === "VIEW") return offered.filter(isRead);
	return [];
};

const sameKeys = (
	left: ReadonlyArray<PermissionKey>,
	right: ReadonlyArray<PermissionKey>
): boolean =>
	left.length === right.length && left.every((key) => right.includes(key));

/** The level `selected` holds among an area's `offered` keys. */
export const areaLevel = (
	offered: ReadonlyArray<PermissionKey>,
	selected: ReadonlyArray<PermissionKey>
): AreaLevel => {
	const held = offered.filter((key) => selected.includes(key));
	if (held.length === 0) return "NONE";
	if (sameKeys(held, keysAtLevel(offered, "VIEW"))) return "VIEW";
	if (sameKeys(held, offered)) return "MANAGE";
	return "CUSTOM";
};

/** The levels that can be chosen: Manage only when the area has more than reads. */
export const choosableLevels = (
	offered: ReadonlyArray<PermissionKey>
): Array<AreaLevel> =>
	offered.some((key) => !isRead(key))
		? ["NONE", "VIEW", "MANAGE"]
		: ["NONE", "VIEW"];

/** Whether choosing `level` gives only keys that are held already or may be given. */
export const canChooseLevel = (
	offered: ReadonlyArray<PermissionKey>,
	level: AreaLevel,
	selected: ReadonlyArray<PermissionKey>,
	unavailable: ReadonlyArray<PermissionKey>
): boolean =>
	keysAtLevel(offered, level).every(
		(key) => selected.includes(key) || !unavailable.includes(key)
	);

/**
 * The selection once an area is set to `level`: the area's keys outside the
 * level are cleared, with whatever needs them, and the level's keys are
 * ticked with what they need, as ticking them one by one would. Keys that
 * can't be given are skipped. What the keys work with is the caller's to add.
 */
export const withAreaLevel = (
	selected: ReadonlyArray<PermissionKey>,
	offered: ReadonlyArray<PermissionKey>,
	level: AreaLevel,
	unavailable: ReadonlyArray<PermissionKey> = []
): Array<PermissionKey> => {
	const target = keysAtLevel(offered, level);
	const cleared = offered
		.filter((key) => !target.includes(key))
		.reduce<Array<PermissionKey>>(
			(current, key) => togglePermission(current, key, false),
			[...selected]
		);
	return target.reduce<Array<PermissionKey>>(
		(current, key) => togglePermission(current, key, true, unavailable),
		cleared
	);
};

/** Every area with the level `selected` holds there, in the menu's order. */
export const areaLevels = (
	selected: ReadonlyArray<PermissionKey>,
	kind?: AccessRoleKind
): Array<AreaWithLevel> =>
	AREAS.map((area) => ({
		area,
		level: areaLevel(offeredKeys(area, kind), selected),
	}));

/** The names of the areas held at `level`, as one phrase, e.g. "Scheduling and Leave". */
export const areaNames = (
	levels: ReadonlyArray<AreaWithLevel>,
	level: AreaLevel,
	t: TFunction,
	language: string
): string =>
	new Intl.ListFormat(language, { type: "conjunction" }).format(
		levels
			.filter((item) => item.level === level)
			.map((item) => t(`organisation.accessAreas.${item.area}.name`))
	);

const SENTENCE_CLAUSES = [
	["MANAGE", "manages"],
	["VIEW", "views"],
	["CUSTOM", "some"],
] as const;

/**
 * What a role allows, in one sentence, e.g. "This role manages Scheduling
 * and Leave, and views People and Reports."
 */
export const roleSentence = (
	selected: ReadonlyArray<PermissionKey>,
	kind: AccessRoleKind | undefined,
	t: TFunction,
	language: string
): string => {
	const levels = areaLevels(selected, kind);
	const clauses = SENTENCE_CLAUSES.filter(([level]) =>
		levels.some((item) => item.level === level)
	).map(([level, clause]) =>
		t(`organisation.accessAreas.sentence.${clause}`, {
			areas: areaNames(levels, level, t, language),
		})
	);
	if (clauses.length === 0)
		return t("organisation.accessAreas.sentence.nothing");
	return t("organisation.accessAreas.sentence.role", {
		clauses: new Intl.ListFormat(language, { type: "conjunction" }).format(
			clauses
		),
	});
};
