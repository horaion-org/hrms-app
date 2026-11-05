import type { TFunction } from "i18next";
import { z } from "zod";
import { ApiProblemError } from "@/common/problem";
import { mapRefusal, type Refusal } from "@/features/organisation/refusal";
import type { MemberSkill, SkillValue } from "@/features/people/api";
import { PROFILE_REFUSAL_CODES } from "@/features/people/profileRefusal";

/** The most skills one person may have. */
export const MAX_SKILLS = 50;

/** Proficiency runs from 1, a beginner, to 10, an expert. */
export const PROFICIENCY_MIN = 1;
export const PROFICIENCY_MAX = 10;

/** Where a newly given skill's rating starts. */
export const DEFAULT_PROFICIENCY = 5;

/** The most characters a holding's notes take. */
export const SKILL_NOTES_MAX_LENGTH = 500;

/** What the dialog needs to know about a skill to ask the right questions. */
export type SkillMeasure = {
	/** Rated 1 to 10; otherwise simply held. */
	rated: boolean;
	tracksExpiry: boolean;
};

/** How a held skill is measured. A scale newer than the app is treated as not rated. */
export const measureOf = (
	skill: Pick<MemberSkill, "proficiencyScale" | "tracksExpiry">
): SkillMeasure => ({
	rated: skill.proficiencyScale === "ONE_TO_TEN",
	tracksExpiry: skill.tracksExpiry,
});

/** Skill names match ignoring case, as the API matches them. */
export const sameName = (a: string, b: string): boolean =>
	a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

/**
 * A held skill as the replace route takes it back: a rating only for a
 * rated skill and dates only for one tracking expiry, so a holding the API
 * stored is always sent in a shape it accepts.
 */
export const valueOf = (held: MemberSkill): SkillValue => {
	const { rated, tracksExpiry } = measureOf(held);
	return {
		name: held.name,
		proficiency: rated ? held.proficiency : null,
		notes: held.notes,
		issuedOn: tracksExpiry ? held.issuedOn : null,
		expiresOn: tracksExpiry ? held.expiresOn : null,
	};
};

/** The complete set with `added` after the skills they hold. */
export const withHolding = (
	held: ReadonlyArray<MemberSkill>,
	added: SkillValue
): Array<SkillValue> => [...held.map(valueOf), added];

/** The complete set with the holding named like `changed` replaced by it, in place. */
export const withChangedHolding = (
	held: ReadonlyArray<MemberSkill>,
	changed: SkillValue
): Array<SkillValue> =>
	held.map((skill) =>
		sameName(skill.name, changed.name) ? changed : valueOf(skill)
	);

/** The complete set without the holding named `name`. */
export const withoutHolding = (
	held: ReadonlyArray<MemberSkill>,
	name: string
): Array<SkillValue> =>
	held.filter((skill) => !sameName(skill.name, name)).map(valueOf);

/**
 * A holding as the dialog takes it: a chosen skill (an active catalogue
 * skill they don't have yet, while they have room for another), a rating
 * for a rated skill, notes, and for a skill that tracks expiry the last
 * day it is valid, on or after the day it was issued.
 */
export const skillFormSchema = (
	t: TFunction,
	{
		measure,
		taken,
		editing,
	}: {
		/** How the chosen skill is measured; undefined until one is chosen. */
		measure: SkillMeasure | undefined;
		/** The names they already hold. */
		taken: ReadonlyArray<string>;
		/** Whether an existing holding is being changed rather than one added. */
		editing: boolean;
	}
): z.ZodType<SkillFormValues, SkillFormValues> => {
	const key = "people.skills.dialog";
	return z
		.object({
			name: z.string().min(1, t(`${key}.nameRequired`)),
			proficiency: z
				.number()
				.int()
				.min(PROFICIENCY_MIN, t(`${key}.proficiencyRejected`))
				.max(PROFICIENCY_MAX, t(`${key}.proficiencyRejected`)),
			notes: z
				.string()
				.trim()
				.max(SKILL_NOTES_MAX_LENGTH, t(`${key}.notesLength`)),
			issuedOn: z.string(),
			expiresOn: z.string(),
		})
		.superRefine((values, context) => {
			if (!editing && taken.some((name) => sameName(name, values.name)))
				context.addIssue({
					code: "custom",
					path: ["name"],
					message: t(`${key}.nameTaken`),
				});
			if (!editing && taken.length >= MAX_SKILLS)
				context.addIssue({
					code: "custom",
					path: ["name"],
					message: t(`${key}.tooMany`),
				});
			if (!measure?.tracksExpiry) return;
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
					message: t(`${key}.datesInvalid`),
				});
		});
};

export type SkillFormValues = {
	name: string;
	proficiency: number;
	notes: string;
	issuedOn: string;
	expiresOn: string;
};

/** What the form sends for a skill measured as `measure`. */
export const skillValueOf = (
	values: SkillFormValues,
	measure: SkillMeasure
): SkillValue => ({
	name: values.name,
	proficiency: measure.rated ? values.proficiency : null,
	notes: values.notes.trim() || null,
	issuedOn: measure.tracksExpiry ? values.issuedOn || null : null,
	expiresOn: measure.tracksExpiry ? values.expiresOn || null : null,
});

export type SkillField = "name" | "proficiency" | "notes" | "expiresOn";

/** Refusals saying the skill's measure changed in the catalogue, whichever entry they name. */
const MEASURE_CHANGED_CODES: ReadonlySet<string> = new Set([
	"MEMBER_SKILL_PROFICIENCY_NOT_ALLOWED",
	"MEMBER_SKILL_DATES_NOT_ALLOWED",
]);

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
	const rowField = (field: string): string => `skills[${row}].${field}`;
	const named =
		error instanceof ApiProblemError &&
		error.fieldErrors.some(({ field }) => field.startsWith(`skills[${row}].`));
	const refusal = mapRefusal<SkillField>(error, {
		// Each code names the entry it refused; only the edited one belongs on the fields.
		codes: named
			? {
					"400 MEMBER_SKILL_UNKNOWN": {
						field: "name",
						message: t(`${key}.unknown`),
					},
					"400 MEMBER_SKILL_INACTIVE": {
						field: "name",
						message: t(`${key}.inactive`),
					},
					"400 MEMBER_SKILL_PROFICIENCY_REQUIRED": {
						field: "proficiency",
						message: t(`${key}.proficiencyRejected`),
					},
					"400 MEMBER_SKILL_EXPIRY_REQUIRED": {
						field: "expiresOn",
						message: t(`${key}.expiresOnRequired`),
					},
					"400 MEMBER_SKILL_DATES_INVALID": {
						field: "expiresOn",
						message: t(`${key}.datesInvalid`),
					},
				}
			: {},
		alerts: {
			[PROFILE_REFUSAL_CODES.profileNotFound]: t("people.form.profileMissing"),
			// The skill changed in the catalogue since the dialog opened.
			"400 MEMBER_SKILL_PROFICIENCY_NOT_ALLOWED": t(`${key}.measureChanged`),
			"400 MEMBER_SKILL_DATES_NOT_ALLOWED": t(`${key}.measureChanged`),
		},
		fieldErrors: {
			[rowField("name")]: { field: "name", message: t(`${key}.nameRejected`) },
			[rowField("proficiency")]: {
				field: "proficiency",
				message: t(`${key}.proficiencyRejected`),
			},
			[rowField("notes")]: { field: "notes", message: t(`${key}.notesLength`) },
			[rowField("expiresOn")]: {
				field: "expiresOn",
				message: t(`${key}.datesInvalid`),
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
		Object.keys(refusal.fields).length === 0 &&
		!MEASURE_CHANGED_CODES.has(error.errorCode ?? "")
	)
		return { ...refusal, message: t(`${key}.otherRejected`) };
	return refusal;
};
