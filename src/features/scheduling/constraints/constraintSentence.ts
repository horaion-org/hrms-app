import type { TFunction } from "i18next";
import {
	CONSTRAINT_COMPARISONS,
	type ConstraintComparison,
	type ConstraintField,
	type ConstraintRequirement,
	type ConstraintType,
} from "@/features/scheduling/constraints/api";
import { dayTypeLabel } from "@/features/scheduling/dayTypes";
import { WEEKDAYS, type Weekday } from "@/features/scheduling/shifts/api";

/*
 * A constraint read as one short sentence, subject first: "Front desk AM
 * needs at least 2 people as Clerk or Lead." Each type has a sentence per
 * comparison, and the shift types one for a single shift and one for several
 * (`scheduling.constraints.sentences.<TYPE>…`), each with a plural form per
 * number. A rule about day types says who it covers: full-timers or
 * everyone. Each tag is filled with the field's values in words. How firm the
 * constraint is (Must or If possible) is not in the sentence; it is a tag in
 * front of it (`firmnessOf`).
 */

/** One value as a sentence reads it; a job title or shift goes by its name. */
export type SentenceValue = {
	field: ConstraintField;
	value: string;
	name: string | null;
};

/** Each field of a constraint in words; a field not filled in yet has none. */
export type ConstraintWords = Partial<Record<ConstraintField, string>>;

/** What a constraint's sentence is chosen from: its type, the values filled in so far, and who it covers. */
type SentenceSource = {
	type: ConstraintType;
	values: ReadonlyArray<Pick<SentenceValue, "field" | "value">>;
	/** Whether its type covers full-timers only (`ConstraintTypeOption.fullTimersOnly`); absent reads as everyone. */
	fullTimersOnly?: boolean;
};

const SENTENCES = "scheduling.constraints.sentences";

/** A shift type reads differently for one shift and for several. */
type ShiftCount = "oneShift" | "severalShifts";

/** Who a rule about day types covers. */
type CoveredGroup = "fullTimers" | "everyone";

/** The weekly rule takes "at least" or "exactly", never "at most" (`ConstraintFieldSpec.comparisons`). */
type WeeklyComparison = "AT_LEAST" | "EXACTLY";

/** The copy key of one sentence of a constraint. */
export type SentenceKey =
	| `${typeof SENTENCES}.${"SHIFT_STAFFING" | "ROLE_PRESENCE"}.${ShiftCount}.${ConstraintComparison}`
	| `${typeof SENTENCES}.SHIFT_STAFFING_WITH_STAND_INS.${ShiftCount}.AT_LEAST`
	| `${typeof SENTENCES}.SHIFT_STAFFING_WITH_STAND_INS.standIns`
	| `${typeof SENTENCES}.DAYS_OFF_PER_PERIOD.${ConstraintComparison}`
	| `${typeof SENTENCES}.AVOID_DAYS_OFF_ON`
	| `${typeof SENTENCES}.REST_BETWEEN_SHIFTS`
	| `${typeof SENTENCES}.MAX_DAYS_WITHOUT_DAY_TYPES.${CoveredGroup}`
	| `${typeof SENTENCES}.DAY_TYPE_DAYS_PER_WEEK.${CoveredGroup}.${WeeklyComparison}`;

/** One sentence of a constraint: its copy key and the number its plural follows. */
export type SentencePart = { i18nKey: SentenceKey; count: number };

/** A number not filled in yet reads as plural, so the preview says "how many people". */
const UNFILLED_COUNT = 2;

/** The types that offer no choice, and how firm they always are. */
const FIXED_FIRMNESS: Partial<Record<ConstraintType, ConstraintRequirement>> = {
	AVOID_DAYS_OFF_ON: "SHOULD",
	REST_BETWEEN_SHIFTS: "MUST",
	MAX_DAYS_WITHOUT_DAY_TYPES: "MUST",
	DAY_TYPE_DAYS_PER_WEEK: "MUST",
};

const valuesOf = (
	constraint: SentenceSource,
	field: ConstraintField
): Array<string> =>
	constraint.values
		.filter((value) => value.field === field)
		.map((value) => value.value);

const countOf = (
	constraint: SentenceSource,
	field: ConstraintField
): number => {
	const [text] = valuesOf(constraint, field);
	return text === undefined || text === "" ? UNFILLED_COUNT : Number(text);
};

/** The chosen comparison; "at least" for a type without one, or before one is chosen. */
const comparisonOf = (constraint: SentenceSource): ConstraintComparison => {
	const [chosen] = valuesOf(constraint, "COMPARISON");
	return (
		CONSTRAINT_COMPARISONS.find((comparison) => comparison === chosen) ??
		"AT_LEAST"
	);
};

const shiftCountOf = (constraint: SentenceSource): ShiftCount =>
	valuesOf(constraint, "SHIFT").length > 1 ? "severalShifts" : "oneShift";

const coveredGroupOf = (constraint: SentenceSource): CoveredGroup =>
	constraint.fullTimersOnly ? "fullTimers" : "everyone";

/** "Exactly" when chosen, else "at least", the weekly rule's default. */
const weeklyComparisonOf = (constraint: SentenceSource): WeeklyComparison =>
	comparisonOf(constraint) === "EXACTLY" ? "EXACTLY" : "AT_LEAST";

/** How many days of its day types the weekly rule asks for; any other rule names one day ("without a Rest day"). */
const dayTypeCountOf = (constraint: SentenceSource): number =>
	constraint.type === "DAY_TYPE_DAYS_PER_WEEK"
		? countOf(constraint, "DAY_TYPE_COUNT")
		: 1;

/** The sentences a constraint reads as: one, or with stand-ins a second saying what a stand-in counts for. */
export const sentencePartsOf = (
	constraint: SentenceSource
): Array<SentencePart> => {
	switch (constraint.type) {
		case "SHIFT_STAFFING":
		case "ROLE_PRESENCE":
			return [
				{
					i18nKey: `${SENTENCES}.${constraint.type}.${shiftCountOf(constraint)}.${comparisonOf(constraint)}`,
					count: countOf(constraint, "HEADCOUNT"),
				},
			];
		case "SHIFT_STAFFING_WITH_STAND_INS":
			return [
				{
					i18nKey: `${SENTENCES}.${constraint.type}.${shiftCountOf(constraint)}.AT_LEAST`,
					count: countOf(constraint, "HEADCOUNT"),
				},
				{
					i18nKey: `${SENTENCES}.${constraint.type}.standIns`,
					count: countOf(constraint, "STAND_INS_PER_PERSON"),
				},
			];
		case "DAYS_OFF_PER_PERIOD":
			return [
				{
					i18nKey: `${SENTENCES}.${constraint.type}.${comparisonOf(constraint)}`,
					count: countOf(constraint, "DAYS_OFF"),
				},
			];
		case "AVOID_DAYS_OFF_ON":
			return [{ i18nKey: `${SENTENCES}.${constraint.type}`, count: 1 }];
		case "REST_BETWEEN_SHIFTS":
			return [
				{
					i18nKey: `${SENTENCES}.${constraint.type}`,
					count: countOf(constraint, "REST_HOURS"),
				},
			];
		case "MAX_DAYS_WITHOUT_DAY_TYPES":
			return [
				{
					i18nKey: `${SENTENCES}.${constraint.type}.${coveredGroupOf(constraint)}`,
					count: countOf(constraint, "DAYS_IN_A_ROW"),
				},
			];
		case "DAY_TYPE_DAYS_PER_WEEK":
			return [
				{
					i18nKey: `${SENTENCES}.${constraint.type}.${coveredGroupOf(constraint)}.${weeklyComparisonOf(constraint)}`,
					count: countOf(constraint, "DAY_TYPE_COUNT"),
				},
			];
	}
};

const isWeekday = (text: string): text is Weekday =>
	(WEEKDAYS as ReadonlyArray<string>).includes(text);

/**
 * One value in words: a job title's or shift's name, a day type by its label
 * (plural when the weekly rule counts more than one), a weekday in words, a
 * number as written.
 */
const wordOf = (
	{ field, value, name }: SentenceValue,
	dayTypeCount: number,
	t: TFunction
): string => {
	if (name !== null) return name;
	if (field === "DAY_TYPE") return dayTypeLabel(value, t, dayTypeCount);
	if (isWeekday(value)) return t(`weekdays.${value}`);
	return value;
};

/**
 * Anyone with one of several job titles counts, so they join with "or", as do
 * day types: any one of them breaks a run. On duty "at least" over several
 * shifts is met on any one of them, so those shifts join with "or" too;
 * everything else joins with "and".
 */
const joinsWithOr = (
	constraint: SentenceSource,
	field: ConstraintField
): boolean =>
	field === "JOB_TITLE" ||
	field === "STAND_IN_JOB_TITLE" ||
	field === "DAY_TYPE" ||
	(field === "SHIFT" &&
		constraint.type === "ROLE_PRESENCE" &&
		comparisonOf(constraint) === "AT_LEAST");

/** Each field of a constraint in words, its values as one list in the order given; the comparison is in the sentence itself. */
export const constraintWords = (
	constraint: {
		type: ConstraintType;
		values: ReadonlyArray<SentenceValue>;
	},
	t: TFunction
): ConstraintWords => {
	const words: ConstraintWords = {};
	const dayTypeCount = dayTypeCountOf(constraint);
	const fields = new Set(constraint.values.map((value) => value.field));
	fields.delete("COMPARISON");
	for (const field of fields)
		words[field] = t(
			joinsWithOr(constraint, field)
				? "scheduling.constraints.listOr"
				: "scheduling.constraints.list",
			{
				items: constraint.values
					.filter((value) => value.field === field)
					.map((value) => wordOf(value, dayTypeCount, t)),
			}
		);
	return words;
};

/** Must or If possible: the chosen requirement, or the one a fixed type always has; null while none is chosen. */
export const firmnessOf = (constraint: {
	type: ConstraintType;
	requirement: ConstraintRequirement | null;
}): ConstraintRequirement | null =>
	constraint.requirement ?? FIXED_FIRMNESS[constraint.type] ?? null;
