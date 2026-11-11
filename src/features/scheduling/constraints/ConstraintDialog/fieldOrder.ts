import type {
	ConstraintField,
	ConstraintFieldSpec,
	ConstraintType,
	ConstraintTypeOption,
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
	DAYS_OFF_PER_PERIOD: ["COMPARISON", "DAYS_OFF", "PERIOD_DAYS"],
	AVOID_DAYS_OFF_ON: ["WEEKDAY"],
	REST_BETWEEN_SHIFTS: ["REST_HOURS"],
};

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
	return [...option.fields].sort(
		(first, second) => placeOf(first) - placeOf(second)
	);
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
