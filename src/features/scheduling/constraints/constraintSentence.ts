import type { TFunction } from "i18next";
import {
	CONSTRAINT_COMPARISONS,
	PATTERN_DAYS,
	type ConstraintComparison,
	type ConstraintField,
	type ConstraintRequirement,
	type ConstraintType,
	type ConstraintValueProblem,
	type PatternDay,
	type RequirementPolicy,
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
	/** Why a stored value no longer fits, as the API says; absent while a rule is being filled in. */
	problem?: ConstraintValueProblem | null;
};

/** Each field of a constraint in words; a field not filled in yet has none. */
export type ConstraintWords = Partial<Record<ConstraintField, string>>;

/** What a constraint's sentence is chosen from: its type, the values filled in so far, and who it covers. */
type SentenceSource = {
	type: ConstraintType;
	values: ReadonlyArray<Pick<SentenceValue, "field" | "value">>;
	/** Whether its type covers full-timers only (`ConstraintTypeOption.fullTimersOnly`); absent reads as everyone. */
	fullTimersOnly?: boolean;
	/** Must or If possible, for the rules whose sentence says it; absent reads as If possible. */
	requirement?: ConstraintRequirement | null;
};

/** How a rule whose sentence changes with its firmness reads it: a Must says what never happens. */
type Firmness = "must" | "ifPossible";

/** A Must reads as what never happens; If possible, or none chosen yet, as what is tried. */
const firmnessWordsOf = (constraint: SentenceSource): Firmness =>
	constraint.requirement === "MUST" ? "must" : "ifPossible";

const SENTENCES = "scheduling.constraints.sentences";

/** A shift type reads differently for one shift and for several. */
type ShiftCount = "oneShift" | "severalShifts";

/** Who a rule about day types covers. */
type CoveredGroup = "fullTimers" | "everyone";

/** The pay rates read as their overtime and rest-day rates, then how a day off worked counts. */
type PayRatesPart = "rates" | "dayOffOrdinary" | "dayOffPriced";

/** A days-off rule counts every day off, or only the day types it names. */
type DaysOffCounted = "everyDayOff" | "dayTypes";

/** A banned pattern's days after the first, each read as "then …" in its sentence. */
type LaterPatternDay = Exclude<PatternDay, "PATTERN_DAY_1">;

/** The weekly rule takes "at least" or "exactly", never "at most" (`ConstraintFieldSpec.comparisons`). */
type WeeklyComparison = "AT_LEAST" | "EXACTLY";

/** The copy key of one sentence of a constraint. */
export type SentenceKey =
	| `${typeof SENTENCES}.${"SHIFT_STAFFING" | "ROLE_PRESENCE"}.${ShiftCount}.${ConstraintComparison}`
	| `${typeof SENTENCES}.SHIFT_STAFFING_WITH_STAND_INS.${ShiftCount}.AT_LEAST`
	| `${typeof SENTENCES}.SHIFT_STAFFING_WITH_STAND_INS.standIns`
	| `${typeof SENTENCES}.DAYS_OFF_PER_PERIOD.${DaysOffCounted}.${ConstraintComparison}`
	| `${typeof SENTENCES}.AVOID_DAYS_OFF_ON.${Firmness}`
	| `${typeof SENTENCES}.REST_BETWEEN_SHIFTS`
	| `${typeof SENTENCES}.BANNED_SHIFT_PATTERN.${Firmness}`
	| `${typeof SENTENCES}.BANNED_SHIFT_PATTERN.then.${LaterPatternDay}`
	| `${typeof SENTENCES}.BANNED_SHIFT_PATTERN.end`
	| `${typeof SENTENCES}.MAX_WORK_HOURS_PER_DAY`
	| `${typeof SENTENCES}.MAX_OVERTIME_HOURS_PER_MONTH`
	| `${typeof SENTENCES}.SHORTEST_PART_SHIFT`
	| `${typeof SENTENCES}.MAX_CALL_BACKS_PER_PERSON`
	| `${typeof SENTENCES}.OVERTIME_STRETCH`
	| `${typeof SENTENCES}.PAY_RATES.${PayRatesPart}`
	| `${typeof SENTENCES}.NO_OVERTIME_WHEN_GENERATING`
	| `${typeof SENTENCES}.KEEP_DAYS_OFF_TOGETHER.${Firmness}`
	| `${typeof SENTENCES}.MAX_DAYS_WITHOUT_DAY_TYPES.${CoveredGroup}`
	| `${typeof SENTENCES}.DAY_TYPE_DAYS_PER_WEEK.${CoveredGroup}.${WeeklyComparison}`;

/** One sentence of a constraint: its copy key and the number its plural follows. */
export type SentencePart = { i18nKey: SentenceKey; count: number };

/** A number not filled in yet reads as plural, so the preview says "how many people". */
const UNFILLED_COUNT = 2;

/** How firm a type always is when its policy gives no choice; a choice or a setting has none fixed. */
const FIXED_FIRMNESS: Partial<
	Record<RequirementPolicy, ConstraintRequirement>
> = {
	ALWAYS_MUST: "MUST",
	ALWAYS_SHOULD: "SHOULD",
};

/** The types whose sentence is one number, and the field that number is read from. */
const COUNTED_FIELD = {
	REST_BETWEEN_SHIFTS: "REST_HOURS",
	MAX_WORK_HOURS_PER_DAY: "WORK_HOURS_A_DAY",
	MAX_OVERTIME_HOURS_PER_MONTH: "OVERTIME_HOURS_A_MONTH",
	SHORTEST_PART_SHIFT: "PART_SHIFT_MINUTES",
	MAX_CALL_BACKS_PER_PERSON: "CALL_BACKS",
	OVERTIME_STRETCH: "STRETCH_HOURS",
} as const satisfies Partial<Record<ConstraintType, ConstraintField>>;

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

/**
 * How many days of its day types a rule names: the weekly rule its count, the
 * days-off rule its days off ("2 Rest days"), any other one day ("without a
 * Rest day").
 */
const dayTypeCountOf = (constraint: SentenceSource): number => {
	if (constraint.type === "DAY_TYPE_DAYS_PER_WEEK")
		return countOf(constraint, "DAY_TYPE_COUNT");
	return constraint.type === "DAYS_OFF_PER_PERIOD"
		? countOf(constraint, "DAYS_OFF")
		: 1;
};

/**
 * Whether a days-off rule counts every day off, or only the day types it
 * names (ADR-0087 in the API): "2 days off" or "2 Rest days".
 */
const daysOffCountedOf = (constraint: SentenceSource): DaysOffCounted =>
	constraint.values.some((value) => value.field === "DAY_TYPE")
		? "dayTypes"
		: "everyDayOff";

const isLaterPatternDay = (day: PatternDay): day is LaterPatternDay =>
	day !== "PATTERN_DAY_1";

/**
 * The days after the first a banned pattern's sentence reads: the second
 * always, so a new pattern shows its placeholder, and a later one once it
 * has a shift.
 */
const laterPatternDaysOf = (
	constraint: SentenceSource
): Array<LaterPatternDay> =>
	PATTERN_DAYS.filter(isLaterPatternDay).filter(
		(day) => day === "PATTERN_DAY_2" || valuesOf(constraint, day).length > 0
	);

/**
 * The sentences a constraint reads as: one, with stand-ins a second saying
 * what a stand-in counts for, and a banned pattern one per day ("Nobody works
 * Night", "then Morning", "on consecutive days.").
 */
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
					i18nKey: `${SENTENCES}.${constraint.type}.${daysOffCountedOf(constraint)}.${comparisonOf(constraint)}`,
					count: countOf(constraint, "DAYS_OFF"),
				},
			];
		case "AVOID_DAYS_OFF_ON":
		case "KEEP_DAYS_OFF_TOGETHER":
			return [
				{
					i18nKey: `${SENTENCES}.${constraint.type}.${firmnessWordsOf(constraint)}`,
					count: 1,
				},
			];
		case "BANNED_SHIFT_PATTERN":
			return [
				{
					i18nKey: `${SENTENCES}.${constraint.type}.${firmnessWordsOf(constraint)}`,
					count: 1,
				},
				...laterPatternDaysOf(constraint).map((day): SentencePart => ({
					// The type is written out: inside a callback the switch's narrowing of `constraint.type` is lost.
					i18nKey: `${SENTENCES}.BANNED_SHIFT_PATTERN.then.${day}`,
					count: 1,
				})),
				{ i18nKey: `${SENTENCES}.${constraint.type}.end`, count: 1 },
			];
		case "REST_BETWEEN_SHIFTS":
		case "MAX_WORK_HOURS_PER_DAY":
		case "MAX_OVERTIME_HOURS_PER_MONTH":
		case "SHORTEST_PART_SHIFT":
		case "MAX_CALL_BACKS_PER_PERSON":
		case "OVERTIME_STRETCH":
			return [
				{
					i18nKey: `${SENTENCES}.${constraint.type}`,
					count: countOf(constraint, COUNTED_FIELD[constraint.type]),
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
		case "PAY_RATES":
			return [
				{ i18nKey: `${SENTENCES}.${constraint.type}.rates`, count: 1 },
				{
					i18nKey: `${SENTENCES}.${constraint.type}.${valuesOf(constraint, "DAY_OFF_WORK_PERCENT").length > 0 ? "dayOffPriced" : "dayOffOrdinary"}`,
					count: 1,
				},
			];
		case "NO_OVERTIME_WHEN_GENERATING":
			return [{ i18nKey: `${SENTENCES}.${constraint.type}`, count: 1 }];
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
	if (field === "PERIOD_WEEKS" && value !== "")
		return t("scheduling.constraints.periodWeeksInSentence", {
			count: Number(value),
		});
	if (isWeekday(value)) return t(`weekdays.${value}`);
	return value;
};

/**
 * Anyone with one of several job titles counts, so they join with "or", as do
 * day types: any one of them breaks a run, and the shifts of one day of a
 * banned pattern: any one of them on that day counts. On duty "at least" over several
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
	(PATTERN_DAYS as ReadonlyArray<ConstraintField>).includes(field) ||
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
	// A days-off rule that kept its period in days has no period in weeks yet (ADR-0097 in the API).
	if (fields.has("PERIOD_DAYS") && !fields.has("PERIOD_WEEKS"))
		words.PERIOD_WEEKS = t("scheduling.constraints.periodToChoose");
	return words;
};

/**
 * Must or If possible: the chosen requirement, or the one its type's policy
 * always gives (the API's `requirementPolicy`); null while none is chosen,
 * for a setting, or while the type's policy is not known yet.
 */
export const firmnessOf = (constraint: {
	requirement: ConstraintRequirement | null;
	requirementPolicy?: RequirementPolicy;
}): ConstraintRequirement | null =>
	constraint.requirement ??
	(constraint.requirementPolicy
		? FIXED_FIRMNESS[constraint.requirementPolicy]
		: undefined) ??
	null;
