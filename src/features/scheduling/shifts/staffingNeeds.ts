import type { DepartmentConstraint } from "@/features/scheduling/constraints/api";

/** What one staffing constraint asks of a shift: how many people, as which job titles, and how firmly. */
export type ShiftNeed = {
	constraintId: string;
	/** The constraint's name and Department, to match it to the staffing read. */
	name: string;
	departmentId: string | null;
	/** At least, at most or exactly; at least when the constraint names none. */
	comparison: string;
	headcount: number;
	jobTitleNames: Array<string>;
	/** Someone on duty for the whole shift, rather than people on it. */
	onDuty: boolean;
	ifPossible: boolean;
};

/** What the needs read of a constraint. */
export type NeedingConstraint = Pick<
	DepartmentConstraint,
	| "constraintId"
	| "name"
	| "departmentId"
	| "category"
	| "requirement"
	| "status"
	| "values"
>;

const DEFAULT_COMPARISON = "AT_LEAST";

/**
 * What the active constraints ask of each shift, by shift id: every one that
 * names shifts and a headcount, as the API stores them. The kinds that ask
 * for people are told apart by their values, not by a list of type names; a
 * constraint of the "On duty throughout" category reads as on duty.
 */
export const staffingNeedsByShift = (
	constraints: ReadonlyArray<NeedingConstraint>
): Map<string, Array<ShiftNeed>> => {
	const needs = new Map<string, Array<ShiftNeed>>();
	for (const constraint of constraints) {
		if (constraint.status === "INACTIVE") continue;
		const valuesOf = (field: string): NeedingConstraint["values"] =>
			constraint.values.filter((value) => value.field === field);
		const headcount = valuesOf("HEADCOUNT")[0];
		const shifts = valuesOf("SHIFT");
		if (!headcount || shifts.length === 0) continue;
		const need: ShiftNeed = {
			constraintId: constraint.constraintId,
			name: constraint.name,
			departmentId: constraint.departmentId,
			comparison: valuesOf("COMPARISON")[0]?.value ?? DEFAULT_COMPARISON,
			headcount: Number(headcount.value),
			jobTitleNames: valuesOf("JOB_TITLE").map(
				(value) => value.name ?? value.value
			),
			onDuty: constraint.category === "ROLE_COVERAGE",
			ifPossible: constraint.requirement === "SHOULD",
		};
		for (const shift of shifts)
			needs.set(shift.value, [...(needs.get(shift.value) ?? []), need]);
	}
	return needs;
};
