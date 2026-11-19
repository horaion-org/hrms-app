import {
	PATTERN_DAYS,
	type ConstraintField,
	type ConstraintFieldSpec,
	type ConstraintTypeOption,
} from "@/features/scheduling/constraints/api";
import { fieldReadingOrderOf } from "@/features/scheduling/constraints/constraintTypeCatalogue";

/**
 * Fields the API still takes that the dialog no longer shows: time off earned
 * has no rule that reads it yet. A stored value is kept and sent back as it was.
 */
export const HIDDEN_FIELDS: ReadonlyArray<ConstraintField> = [
	"TIME_OFF_EARNED_PERCENT",
];

/**
 * A type's fields in the order its sentence reads them (its catalogue
 * record's `fieldReadingOrder`), so a manager fills them in as they would say
 * the constraint; the API's field list stays as it is. A field the order does
 * not know keeps its API place after the known ones.
 */
export const fieldsInReadingOrder = (
	option: Pick<ConstraintTypeOption, "type" | "fields">
): Array<ConstraintFieldSpec> => {
	const order = fieldReadingOrderOf(option.type);
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
	const day = PATTERN_DAYS.findIndex((patternDay) => patternDay === field);
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
