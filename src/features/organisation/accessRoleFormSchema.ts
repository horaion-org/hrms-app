import type { TFunction } from "i18next";
import { z } from "zod";
import { nameSchema } from "@/features/organisation/nameSchema";
import {
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

/** The editor's fields. "At least one permission" is shown beside Save, not as a field error. */
export const accessRoleFormSchema = (
	t: TFunction
): z.ZodObject<{
	name: z.ZodString;
	permissions: z.ZodArray<z.ZodType<PermissionKey, PermissionKey>>;
}> => {
	const key = "organisation.accessRoles.editor";
	return z.object({
		name: nameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
		permissions: z.array(z.enum(PERMISSION_KEYS)),
	});
};

export type AccessRoleFormValues = z.infer<
	ReturnType<typeof accessRoleFormSchema>
>;
