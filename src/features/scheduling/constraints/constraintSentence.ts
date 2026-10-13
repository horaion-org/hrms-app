import type { TFunction } from "i18next";
import {
	CONSTRAINT_COMPARISONS,
	type ConstraintComparison,
	type ConstraintField,
	type ConstraintRequirement,
	type ConstraintType,
	type ConstraintTypeOption,
} from "@/features/scheduling/constraints/api";
import { WEEKDAYS, type Weekday } from "@/features/scheduling/shifts/api";

/*
 * A constraint read as one sentence. Each type has one sentence in the copy
 * (`scheduling.constraints.sentences.<TYPE>`) with a tag per slot: the
 * requirement, and each field the type takes, named as the API names it. The
 * slots are filled from the constraint's values, so a constraint reads the same
 * whether it is listed, frozen or still being filled in.
 */

/** A part of a constraint's sentence: its requirement, or one of the fields its type takes. */
export type ConstraintSlot = ConstraintField | "REQUIREMENT";

/** One value as a sentence reads it; a job title or shift goes by its name. */
export type SentenceValue = {
	field: ConstraintField;
	value: string;
	name: string | null;
};

/** Each slot of a constraint's sentence in words; a slot not filled in yet has none. */
export type ConstraintWords = Partial<Record<ConstraintSlot, string>>;

/** The slots a type's sentence has. */
export const sentenceSlotsOf = (
	type: Pick<ConstraintTypeOption, "hasRequirement" | "fields">
): Array<ConstraintSlot> => [
	...(type.hasRequirement ? (["REQUIREMENT"] as const) : []),
	...type.fields.map((spec) => spec.field),
];

/** The copy key of the sentence a constraint of `type` reads as. */
export const sentenceKey = (
	type: ConstraintType
): `scheduling.constraints.sentences.${ConstraintType}` =>
	`scheduling.constraints.sentences.${type}`;

const isComparison = (text: string): text is ConstraintComparison =>
	(CONSTRAINT_COMPARISONS as ReadonlyArray<string>).includes(text);

const isWeekday = (text: string): text is Weekday =>
	(WEEKDAYS as ReadonlyArray<string>).includes(text);

/** One value in words: a job title's or shift's name, a comparison or weekday in words, a number as written. */
const wordOf = ({ value, name }: SentenceValue, t: TFunction): string => {
	if (name !== null) return name;
	if (isComparison(value))
		return t(`scheduling.constraints.comparisonWords.${value}`);
	if (isWeekday(value)) return t(`scheduling.dayNames.${value}`);
	return value;
};

/** Each slot of a constraint in words: its requirement, and each field's values as one list, in the order given. */
export const constraintWords = (
	constraint: {
		requirement: ConstraintRequirement | null;
		values: ReadonlyArray<SentenceValue>;
	},
	t: TFunction
): ConstraintWords => {
	const words: ConstraintWords = {};
	if (constraint.requirement)
		words.REQUIREMENT = t(
			`scheduling.constraints.requirementWords.${constraint.requirement}`
		);
	for (const field of new Set(constraint.values.map((value) => value.field)))
		words[field] = t("scheduling.constraints.list", {
			items: constraint.values
				.filter((value) => value.field === field)
				.map((value) => wordOf(value, t)),
		});
	return words;
};
