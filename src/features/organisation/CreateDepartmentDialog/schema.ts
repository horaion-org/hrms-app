import type { TFunction } from "i18next";
import { z } from "zod";
import type { companyMemberSchema } from "@/features/organisation/api";
import {
	headsSchema,
	unitNameSchema,
} from "@/features/organisation/createSchemas";

export const createDepartmentSchema = (
	t: TFunction
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
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
		heads: headsSchema({
			required: t(`${key}.headsRequired`),
			max: t(`${key}.headsMax`),
		}),
	});
};

export type CreateDepartmentValues = z.infer<
	ReturnType<typeof createDepartmentSchema>
>;
