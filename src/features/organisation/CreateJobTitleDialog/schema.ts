import type { TFunction } from "i18next";
import { z } from "zod";
import { JOB_TITLE_DESCRIPTION_MAX_LENGTH } from "@/features/organisation/api";
import { unitNameSchema } from "@/features/organisation/createSchemas";

export const createJobTitleSchema = (
	t: TFunction
): z.ZodObject<{
	departmentId: z.ZodString;
	name: z.ZodString;
	description: z.ZodString;
}> => {
	const key = "organisation.jobTitles.createDialog";
	return z.object({
		departmentId: z.string().min(1, t(`${key}.departmentRequired`)),
		name: unitNameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
		// Optional; judged as the API stores it, after trimming.
		description: z
			.string()
			.trim()
			.max(JOB_TITLE_DESCRIPTION_MAX_LENGTH, t(`${key}.descriptionLength`)),
	});
};

export type CreateJobTitleValues = z.infer<
	ReturnType<typeof createJobTitleSchema>
>;
