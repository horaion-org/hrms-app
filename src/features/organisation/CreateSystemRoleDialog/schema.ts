import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";

export const createSystemRoleSchema = (
	t: TFunction
): z.ZodObject<{
	name: z.ZodString;
	permissions: z.ZodArray<z.ZodString>;
}> => {
	const key = "organisation.accessRoles.createDialog";
	return z.object({
		name: unitNameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
		permissions: z.array(z.string()).min(1, t(`${key}.permissionsRequired`)),
	});
};

export type CreateSystemRoleValues = z.infer<
	ReturnType<typeof createSystemRoleSchema>
>;
