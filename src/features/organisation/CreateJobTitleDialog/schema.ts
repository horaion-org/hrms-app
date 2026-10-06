import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";

export const createJobTitleSchema = (
	t: TFunction
): z.ZodObject<{ departmentId: z.ZodString; name: z.ZodString }> => {
	const key = "organisation.jobTitles.createDialog";
	return z.object({
		departmentId: z.string().min(1, t(`${key}.departmentRequired`)),
		name: unitNameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
	});
};

export type CreateJobTitleValues = z.infer<
	ReturnType<typeof createJobTitleSchema>
>;
