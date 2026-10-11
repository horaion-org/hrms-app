import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";
import {
	PERMISSION_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";

export const createSystemRoleSchema = (
	t: TFunction
): z.ZodObject<{
	name: z.ZodString;
	permissions: z.ZodArray<z.ZodType<PermissionKey, PermissionKey>>;
}> => {
	const key = "organisation.accessRoles.createDialog";
	return z.object({
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

export type CreateSystemRoleValues = z.infer<
	ReturnType<typeof createSystemRoleSchema>
>;
