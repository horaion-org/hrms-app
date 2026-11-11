import type { TFunction } from "i18next";
import type { AccessRoleKind } from "@/features/accessRoles/api";
import { canTick } from "@/features/accessRoles/PermissionChecklist/groups";
import { ROLE_TEMPLATES } from "@/features/workspace/permissionContract.generated";
import type {
	AssignableScope,
	PermissionKey,
} from "@/features/workspace/permissionKeys";

/** A template's id, as the API's contract names it, e.g. `roster_planner`. */
export type RoleTemplateKey = (typeof ROLE_TEMPLATES)[number]["key"];

/** A starting point for a new role: a kind and the keys it copies in. */
export type RoleTemplate = {
	key: RoleTemplateKey;
	kind: AccessRoleKind;
	permissions: ReadonlyArray<PermissionKey>;
	/** Where a role made from it can be given, widest first. */
	assignableScopes: ReadonlyArray<AssignableScope>;
};

/** Every template, in the API's order. A role made from one is a copy, never linked to it. */
export const ROLE_TEMPLATE_LIST: ReadonlyArray<RoleTemplate> = ROLE_TEMPLATES;

/** What starting from a template fills in, and what of it was left out. */
export type TemplateStart = {
	kind: AccessRoleKind;
	/** The template's keys the person can give, in catalogue order. */
	permissions: Array<PermissionKey>;
	/** The template's keys they can't give (or whose prerequisite they can't), so nothing of them is added. */
	leftOut: Array<PermissionKey>;
};

/**
 * The role a template starts, for a person who can't give `unavailable`:
 * the template's kind and every key of it they can give, the rest left out
 * and named. The subset rule (API ADR-0017) refuses the rest anyway.
 */
export const startFrom = (
	template: RoleTemplate,
	unavailable: ReadonlyArray<PermissionKey>
): TemplateStart => {
	const permissions = template.permissions.filter((key) =>
		canTick(key, [], unavailable)
	);
	return {
		kind: template.kind,
		permissions,
		leftOut: template.permissions.filter((key) => !permissions.includes(key)),
	};
};

/** Where a role made from a template can be given, in words, e.g. "the whole company or a branch". */
export const templatePlaces = (
	template: RoleTemplate,
	t: TFunction,
	language: string
): string =>
	new Intl.ListFormat(language, { type: "disjunction" }).format(
		template.assignableScopes.map((scope) =>
			t(`organisation.accessRoles.templates.places.${scope}`)
		)
	);
