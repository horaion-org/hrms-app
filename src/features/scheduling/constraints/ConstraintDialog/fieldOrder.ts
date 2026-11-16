import {
	PATTERN_DAYS,
	type ConstraintField,
	type ConstraintFieldSpec,
	type ConstraintType,
	type ConstraintTypeOption,
} from "@/features/scheduling/constraints/api";

/**
 * Each type's fields in the order its sentence reads them, so a manager fills
 * them in as they would say the constraint. The API's field list stays as it
 * is; only the dialog's order comes from here.
 */
export const FIELD_READING_ORDER: Record<
	ConstraintType,
	ReadonlyArray<ConstraintField>
> = {
	SHIFT_STAFFING: ["SHIFT", "COMPARISON", "HEADCOUNT", "JOB_TITLE"],
	SHIFT_STAFFING_WITH_STAND_INS: [
		"SHIFT",
		"HEADCOUNT",
		"JOB_TITLE",
		"STAND_INS_PER_PERSON",
		"STAND_IN_JOB_TITLE",
	],
	ROLE_PRESENCE: ["SHIFT", "COMPARISON", "HEADCOUNT", "JOB_TITLE"],
	DAYS_OFF_PER_PERIOD: ["COMPARISON", "DAYS_OFF", "PERIOD_WEEKS"],
	AVOID_DAYS_OFF_ON: ["WEEKDAY"],
	REST_BETWEEN_SHIFTS: ["REST_HOURS"],
	BANNED_SHIFT_PATTERN: PATTERN_DAYS,
	MAX_DAYS_WITHOUT_DAY_TYPES: ["DAYS_IN_A_ROW", "DAY_TYPE"],
	DAY_TYPE_DAYS_PER_WEEK: ["COMPARISON", "DAY_TYPE_COUNT", "DAY_TYPE"],
	MAX_WORK_HOURS_PER_DAY: ["WORK_HOURS_A_DAY"],
	MAX_OVERTIME_HOURS_PER_MONTH: ["OVERTIME_HOURS_A_MONTH"],
	SHORTEST_PART_SHIFT: ["PART_SHIFT_MINUTES"],
	MAX_CALL_BACKS_PER_PERSON: ["CALL_BACKS"],
	PAY_RATES: [
		"OVERTIME_PERCENT",
		"REST_DAY_WORK_PERCENT",
		"DAY_OFF_WORK_PERCENT",
	],
	NO_OVERTIME_WHEN_GENERATING: [],
	KEEP_DAYS_OFF_TOGETHER: [],
};

/**
 * Fields the API still takes that the dialog no longer shows: time off earned
 * has no rule that reads it yet. A stored value is kept and sent back as it was.
 */
export const HIDDEN_FIELDS: ReadonlyArray<ConstraintField> = [
	"TIME_OFF_EARNED_PERCENT",
];

/** A type's fields in reading order; a field the order does not know keeps its API place after the known ones. */
export const fieldsInReadingOrder = (
	option: Pick<ConstraintTypeOption, "type" | "fields">
): Array<ConstraintFieldSpec> => {
	const order = FIELD_READING_ORDER[option.type];
	const placeOf = (spec: ConstraintFieldSpec): number => {
		const place = order.indexOf(spec.field);
		return place === -1 ? order.length : place;
	};
	// A stable sort keeps unknown fields in the API's order.
	return option.fields
		.filter((spec) => !HIDDEN_FIELDS.includes(spec.field))
		.sort((first, second) => placeOf(first) - placeOf(second));
};

/** The days of a banned pattern always shown: the first two, which every pattern needs. */
const ALWAYS_SHOWN_PATTERN_DAYS = 2;

/**
 * Whether the dialog shows a field for the values chosen so far: a banned
 * pattern's third to seventh days appear one at a time, once the day before
 * has a shift; a day that holds shifts always shows, so it can be cleared.
 * Every other field always shows.
 */
export const isFieldShown = (
	field: ConstraintField,
	values: Partial<Record<ConstraintField, ReadonlyArray<string>>>
): boolean => {
	const day = (PATTERN_DAYS as ReadonlyArray<ConstraintField>).indexOf(field);
	if (day < ALWAYS_SHOWN_PATTERN_DAYS) return true;
	const hasShifts = (dayField: ConstraintField): boolean =>
		(values[dayField] ?? []).some(Boolean);
	return hasShifts(field) || hasShifts(PATTERN_DAYS[day - 1]!);
};

/**
 * A type's fields as the dialog's rows: a comparison and the number it
 * compares share one row ("At least" beside "2"); every other field has its own.
 */
export const fieldRowsInReadingOrder = (
	option: Pick<ConstraintTypeOption, "type" | "fields">
): Array<Array<ConstraintFieldSpec>> => {
	const rows: Array<Array<ConstraintFieldSpec>> = [];
	for (const spec of fieldsInReadingOrder(option)) {
		const previous = rows[rows.length - 1];
		const pairsWithPrevious =
			previous?.length === 1 &&
			previous[0]?.kind === "COMPARISON" &&
			spec.kind === "NUMBER";
		if (previous && pairsWithPrevious) previous.push(spec);
		else rows.push([spec]);
	}
	return rows;
};
