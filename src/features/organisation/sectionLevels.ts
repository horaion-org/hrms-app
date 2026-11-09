import type { TFunction } from "i18next";
import {
	definitionOf,
	moduleOf,
	PERMISSION_KEYS,
	PERMISSION_MODULES,
	type PermissionKey,
	type PermissionModule,
	type PermissionResource,
	resourceOf,
} from "@/features/workspace/permissionKeys";

/**
 * How much of a section a set of keys covers, for a read-only summary:
 * `VIEW` holds only reads, `MANAGE` holds a change, and `FULL` holds every
 * key of the section. Never an input: roles are always edited key by key.
 */
export type SectionLevel = "VIEW" | "MANAGE" | "FULL";

/** One section a set of keys reaches, and the resources it reaches there. */
export type SectionSummary = {
	module: PermissionModule;
	level: SectionLevel;
	resources: Array<PermissionResource>;
};

const KEYS_BY_MODULE = new Map<PermissionModule, Array<PermissionKey>>(
	PERMISSION_MODULES.map((module) => [
		module,
		PERMISSION_KEYS.filter((key) => moduleOf(key) === module),
	])
);

const levelOf = (
	held: ReadonlyArray<PermissionKey>,
	all: ReadonlyArray<PermissionKey>
): SectionLevel => {
	if (held.length === all.length) return "FULL";
	return held.some((key) => definitionOf(key).action !== "read")
		? "MANAGE"
		: "VIEW";
};

/**
 * The sections `keys` reach, in the contract's order, each with its level
 * and the resources held there in catalogue order. Sections with nothing
 * held are left out. Keys this app doesn't know aren't part of `keys`.
 */
export const sectionLevels = (
	keys: ReadonlyArray<PermissionKey>
): Array<SectionSummary> =>
	PERMISSION_MODULES.flatMap((module) => {
		const all = KEYS_BY_MODULE.get(module) ?? [];
		const held = all.filter((key) => keys.includes(key));
		if (held.length === 0) return [];
		return [
			{
				module,
				level: levelOf(held, all),
				resources: [...new Set(held.map(resourceOf))],
			},
		];
	});

/** One section's summary in words, e.g. "Scheduling: Manage". */
export const sectionLevelText = (
	summary: SectionSummary,
	t: TFunction
): string =>
	t("organisation.permissions.summaryLine", {
		section: t(`organisation.permissions.sections.${summary.module}.name`),
		level: t(`organisation.permissions.levels.${summary.level}`),
	});

/** What a set of keys allows, section by section, e.g. "Scheduling: Manage · People: View". */
export const roleSummaryText = (
	keys: ReadonlyArray<PermissionKey>,
	t: TFunction
): string =>
	sectionLevels(keys)
		.map((summary) => sectionLevelText(summary, t))
		.join(" · ");
