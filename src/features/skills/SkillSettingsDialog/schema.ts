import type { TFunction } from "i18next";
import { z } from "zod";
import {
	UNIT_NAME_PATTERN,
	unitNameSchema,
} from "@/features/organisation/createSchemas";
import {
	PROFICIENCY_SCALES,
	SKILL_CATEGORY_MAX_LENGTH,
	SKILL_DESCRIPTION_MAX_LENGTH,
	SKILL_VALIDITY_MAX_MONTHS,
	type SkillBody,
	type SkillOverview,
} from "@/features/skills/api";

const key = "organisation.skills.dialog";

/** Mirrors the API's rules for a skill; whether the name is free stays the API's decision. */
export const skillSettingsSchema = (
	t: TFunction
): z.ZodObject<{
	name: z.ZodString;
	category: z.ZodString;
	description: z.ZodString;
	proficiencyScale: z.ZodEnum<{ ONE_TO_TEN: "ONE_TO_TEN"; NONE: "NONE" }>;
	tracksExpiry: z.ZodBoolean;
	validityMonths: z.ZodString;
}> =>
	z.object({
		name: unitNameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		}),
		// Optional; when given, the unit-name rule with a shorter limit.
		category: z
			.string()
			.trim()
			.refine(
				(value) =>
					value === "" ||
					(value.length >= 2 && value.length <= SKILL_CATEGORY_MAX_LENGTH),
				t(`${key}.categoryLength`)
			)
			.refine(
				(value) => value === "" || UNIT_NAME_PATTERN.test(value),
				t(`${key}.categoryCharacters`)
			),
		description: z
			.string()
			.trim()
			.max(SKILL_DESCRIPTION_MAX_LENGTH, t(`${key}.descriptionLength`)),
		proficiencyScale: z.enum(PROFICIENCY_SCALES),
		tracksExpiry: z.boolean(),
		// Typed as text; empty means no validity.
		validityMonths: z
			.string()
			.trim()
			.refine(
				(value) => {
					if (value === "") return true;
					const months = Number(value);
					return (
						Number.isInteger(months) &&
						months >= 1 &&
						months <= SKILL_VALIDITY_MAX_MONTHS
					);
				},
				t(`${key}.validityRange`)
			),
	});

export type SkillSettingsValues = z.infer<
	ReturnType<typeof skillSettingsSchema>
>;

/** Where the form starts: the skill being edited, or a new rated skill. */
export const initialSkillValues = (
	editing: SkillOverview | undefined
): SkillSettingsValues => ({
	name: editing?.name ?? "",
	category: editing?.category ?? "",
	description: editing?.description ?? "",
	// A scale newer than the app is shown as rated until it is chosen again.
	proficiencyScale:
		editing?.proficiencyScale === "NONE" ? "NONE" : "ONE_TO_TEN",
	tracksExpiry: editing?.tracksExpiry ?? false,
	validityMonths:
		editing?.validityMonths === null || editing?.validityMonths === undefined
			? ""
			: String(editing.validityMonths),
});

/** What the form sends: empty texts as null, and a validity only with expiry tracking. */
export const skillBodyOf = (values: SkillSettingsValues): SkillBody => ({
	name: values.name,
	category: values.category || null,
	description: values.description || null,
	proficiencyScale: values.proficiencyScale,
	tracksExpiry: values.tracksExpiry,
	validityMonths:
		values.tracksExpiry && values.validityMonths !== ""
			? Number(values.validityMonths)
			: null,
});
