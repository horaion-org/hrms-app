import type { TFunction } from "i18next";
import { z } from "zod";
import { ApiProblemError } from "@/common/problem";
import { unitNameSchema } from "@/features/organisation/createSchemas";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";
import type { CompanySkill, SkillValue } from "@/features/people/api";
import { PROFILE_REFUSAL_CODES } from "@/features/people/profileRefusal";

/** The most skills one person may have. */
export const MAX_SKILLS = 50;

/** Proficiency runs from 1, a beginner, to 10, an expert. */
export const PROFICIENCY_MIN = 1;
export const PROFICIENCY_MAX = 10;

/** Where a skill picked in the dialog starts. */
export const DEFAULT_PROFICIENCY = 5;

/** Skill names match ignoring case, as the API matches them. */
const sameName = (a: string, b: string): boolean =>
	a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/** Whether two sets of skills hold the same names at the same proficiency, in any order. */
export const sameSkills = (
	a: ReadonlyArray<SkillValue>,
	b: ReadonlyArray<SkillValue>
): boolean =>
	a.length === b.length &&
	a.every((skill) =>
		b.some(
			(other) =>
				sameName(other.name, skill.name) &&
				other.proficiency === skill.proficiency
		)
	);

/** `skills` with `added`, in name order as the API lists them. */
export const withSkill = (
	skills: ReadonlyArray<SkillValue>,
	added: SkillValue
): Array<SkillValue> =>
	[...skills, added].sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
	);

/** One choice in the skill picker: a name the company uses, or the one typed. */
export type SkillChoice = { name: string; isNew: boolean };

/**
 * The picker's choices: what was typed, as a new name, unless the company
 * already uses it, then the company's names that matched.
 */
export const skillChoices = (
	suggestions: ReadonlyArray<CompanySkill>,
	query: string
): Array<SkillChoice> => {
	const typed = query.trim();
	const existing = suggestions.map(({ name }) => ({ name, isNew: false }));
	return typed && !suggestions.some(({ name }) => sameName(name, typed))
		? [{ name: typed, isNew: true }, ...existing]
		: existing;
};

/**
 * A skill as the dialog adds it: a valid name the person doesn't have yet,
 * while they have room for another, and a proficiency from 1 to 10.
 */
export const skillFormSchema = (
	t: TFunction,
	/** The names they already have. */
	taken: ReadonlyArray<string>
): z.ZodObject<{ name: z.ZodString; proficiency: z.ZodNumber }> => {
	const key = "people.skills.dialog";
	return z.object({
		name: unitNameSchema({
			required: t(`${key}.nameRequired`),
			length: t(`${key}.nameLength`),
			characters: t(`${key}.nameCharacters`),
		})
			.refine((name) => !taken.some((other) => sameName(other, name)), {
				message: t(`${key}.nameTaken`),
			})
			.refine(() => taken.length < MAX_SKILLS, {
				message: t(`${key}.tooMany`),
			}),
		proficiency: z
			.number()
			.int()
			.min(PROFICIENCY_MIN, t(`${key}.proficiencyRejected`))
			.max(PROFICIENCY_MAX, t(`${key}.proficiencyRejected`)),
	});
};

export type SkillFormValues = z.infer<ReturnType<typeof skillFormSchema>>;

export type SkillField = "name" | "proficiency";

/**
 * Why saving a person's skills was refused, read for the skill at `row` of
 * the set sent: its own field errors land on its fields; a refusal of
 * another row, someone else's change at the same moment, and the rest are
 * the dialog's alert. Server codes select frontend-owned copy only.
 */
export const skillsRefusal = (
	error: unknown,
	t: TFunction,
	row: number
): Refusal<SkillField> => {
	const key = "people.skills.dialog";
	// A plain 409, or SKILL_NAME_CONFLICT: both mean someone else changed them.
	if (error instanceof ApiProblemError && error.status === 409)
		return { fields: {}, message: t(`${key}.conflict`), refreshMembers: false };
	const refusal = mapRefusal<SkillField>(error, {
		codes: {
			"400 DUPLICATE_SKILL_NAME": {
				field: "name",
				message: t(`${key}.nameTaken`),
			},
			"400 INVALID_SKILL_NAME": {
				field: "name",
				message: t(`${key}.nameRejected`),
			},
		},
		alerts: {
			[PROFILE_REFUSAL_CODES.profileNotFound]: t("people.form.profileMissing"),
		},
		fieldErrors: {
			[`skills[${row}].name`]: {
				field: "name",
				message: t(`${key}.nameRejected`),
			},
			[`skills[${row}].proficiency`]: {
				field: "proficiency",
				message: t(`${key}.proficiencyRejected`),
			},
		},
		forbidden: t(`${key}.forbidden`),
		failed: t(`${key}.failed`),
	});
	// Field errors that name only the skills they already had.
	if (
		error instanceof ApiProblemError &&
		error.status === 400 &&
		error.fieldErrors.length > 0 &&
		Object.keys(refusal.fields).length === 0
	)
		return { ...refusal, message: t(`${key}.otherRejected`) };
	return refusal;
};
