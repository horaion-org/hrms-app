import type { TFunction } from "i18next";
import { z } from "zod";
import { roleKindSchema } from "@/features/accessRoles/accessRoleFormSchema";
import type { AccessRoleKind } from "@/features/accessRoles/api";
import { unitNameSchema } from "@/features/organisation/createSchemas";
import {
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

export const createAccessRoleSchema = (
	t: TFunction
): z.ZodObject<{
	kind: z.ZodType<AccessRoleKind, AccessRoleKind | "">;
	name: z.ZodString;
	permissions: z.ZodArray<z.ZodType<PermissionKey, PermissionKey>>;
}> => {
	const key = "organisation.accessRoles.createDialog";
	return z.object({
		kind: roleKindSchema(t("organisation.accessRoles.kind.required")),
		name: unitNameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
		permissions: z
			.array(z.enum(PERMISSION_KEYS))
			.min(1, t(`${key}.permissionsRequired`)),
	});
};

/** What the dialog holds while it is filled in: the kind may still be unchosen (""). */
export type CreateAccessRoleInput = z.input<
	ReturnType<typeof createAccessRoleSchema>
>;

/** What the dialog creates: a role with its kind chosen. */
export type CreateAccessRoleValues = z.output<
	ReturnType<typeof createAccessRoleSchema>
>;
