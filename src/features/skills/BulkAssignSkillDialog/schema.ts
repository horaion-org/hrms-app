import type { TFunction } from "i18next";
import { z } from "zod";
import { SKILL_NOTES_MAX_LENGTH } from "@/features/people/skills";
import type { BulkAssignBody, SkillOverview } from "@/features/skills/api";

export type BulkAssignValues = {
	proficiency: number;
	notes: string;
	issuedOn: string;
	expiresOn: string;
	overwrite: boolean;
};

/** What everyone chosen is given; a skill that tracks expiry needs its last valid day. */
export const bulkAssignSchema = (
	t: TFunction,
	tracksExpiry: boolean
): z.ZodType<BulkAssignValues, BulkAssignValues> => {
	const key = "organisation.skills.assign";
	return z
		.object({
			proficiency: z.number().int().min(1).max(10),
			notes: z
				.string()
				.trim()
				.max(SKILL_NOTES_MAX_LENGTH, t("people.skills.dialog.notesLength")),
			issuedOn: z.string(),
			expiresOn: z.string(),
			overwrite: z.boolean(),
		})
		.superRefine((values, context) => {
			if (!tracksExpiry) return;
			if (!values.expiresOn)
				context.addIssue({
					code: "custom",
					path: ["expiresOn"],
					message: t(`${key}.expiresOnRequired`),
				});
			else if (values.issuedOn && values.expiresOn < values.issuedOn)
				context.addIssue({
					code: "custom",
					path: ["expiresOn"],
					message: t("people.skills.dialog.datesInvalid"),
				});
		});
};

/** What the assignment sends: a rating only for a rated skill, dates only for one tracking expiry. */
export const bulkAssignBodyOf = (
	values: BulkAssignValues,
	skill: Pick<SkillOverview, "proficiencyScale" | "tracksExpiry">,
	membershipIds: ReadonlyArray<string>
): BulkAssignBody => ({
	membershipIds,
	proficiency:
		skill.proficiencyScale === "ONE_TO_TEN" ? values.proficiency : null,
	notes: values.notes.trim() || null,
	issuedOn: skill.tracksExpiry ? values.issuedOn || null : null,
	expiresOn: skill.tracksExpiry ? values.expiresOn || null : null,
	overwrite: values.overwrite,
});
