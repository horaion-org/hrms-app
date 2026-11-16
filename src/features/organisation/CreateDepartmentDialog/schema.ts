import type { TFunction } from "i18next";
import { z } from "zod";
import { companyMemberSchema } from "@/features/organisation/api";
import {
	headsSchema,
	unitNameSchema,
} from "@/features/organisation/createSchemas";
import { NAME_LIMITS } from "@/features/organisation/nameSchema";

export const createDepartmentSchema = (
	t: TFunction,
	editing = false
): z.ZodObject<{
	branchId: z.ZodString;
	name: z.ZodString;
	heads: z.ZodArray<typeof companyMemberSchema>;
}> => {
	const key = "organisation.departments.createDialog";
	return z.object({
		branchId: z.string().min(1, t(`${key}.branchRequired`)),
		name: unitNameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`, NAME_LIMITS),
			characters: t(`${key}.nameCharacters`),
		}),
		heads: editing
			? z.array(companyMemberSchema)
			: headsSchema({ max: t(`${key}.headsMax`) }),
	});
};

export type CreateDepartmentValues = z.infer<
	ReturnType<typeof createDepartmentSchema>
>;
