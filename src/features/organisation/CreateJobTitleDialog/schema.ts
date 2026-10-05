import type { TFunction } from "i18next";
import { z } from "zod";
import { unitNameSchema } from "@/features/organisation/createSchemas";

export const createJobTitleSchema = (
	t: TFunction
): z.ZodObject<{ name: z.ZodString }> => {
	const key = "organisation.jobTitles.createDialog";
	return z.object({
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
