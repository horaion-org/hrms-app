import type { TFunction } from "i18next";
import { z } from "zod";
import {
	ACCESS_ROLE_KINDS,
	type AccessRoleKind,
} from "@/features/organisation/api";
import { nameSchema } from "@/features/organisation/nameSchema";
import {
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

/**
 * A role's kind as a form field: empty ("") until the person chooses one,
 * since a role has no default kind, and required on submit.
 */
export const roleKindSchema = (
	required: string
): z.ZodType<AccessRoleKind, AccessRoleKind | ""> =>
	z
		.union([z.enum(ACCESS_ROLE_KINDS), z.literal("")])
		.pipe(z.enum(ACCESS_ROLE_KINDS, { error: required }));

const kindKey = "organisation.accessRoles.kind";

/** One answer to "Where can this role be used?", as a card. */
export type RoleKindChoice = {
	value: AccessRoleKind;
	label: string;
	description: string;
};

/** The answers to "Where can this role be used?", the whole company first. */
export const roleKindChoices = (t: TFunction): Array<RoleKindChoice> =>
	ACCESS_ROLE_KINDS.map((kind) => ({
		value: kind,
		label: t(`${kindKey}.${kind}`),
		description: t(`${kindKey}.hints.${kind}`),
	}));

/** The editor's fields. "At least one permission" is shown beside Save, not as a field error. */
export const accessRoleFormSchema = (
	t: TFunction
): z.ZodObject<{
	kind: z.ZodType<AccessRoleKind, AccessRoleKind | "">;
	name: z.ZodString;
	permissions: z.ZodArray<z.ZodType<PermissionKey, PermissionKey>>;
}> => {
	const key = "organisation.accessRoles.editor";
	return z.object({
		kind: roleKindSchema(t(`${kindKey}.required`)),
		name: nameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
		permissions: z.array(z.enum(PERMISSION_KEYS)),
	});
};

/** What the editor holds while it is filled in: the kind may still be unchosen. */
export type AccessRoleFormInput = z.input<
	ReturnType<typeof accessRoleFormSchema>
>;

/** What the editor submits: a role with its kind chosen. */
export type AccessRoleFormValues = z.output<
	ReturnType<typeof accessRoleFormSchema>
>;
