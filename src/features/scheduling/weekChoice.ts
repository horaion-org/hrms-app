import { isTickable, type Constraint } from "@/features/scheduling/scheduleDraft";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";

/*
 * What one week uses: which of its department's shifts and constraints the
 * schedule takes. Everything is chosen by default; the manager leaves things
 * out for this week only. A constraint naming a shift the week leaves out is
 * switched off, as generation refuses it (`SCHEDULE_CONSTRAINT_UNUSABLE`).
 * Plain values in and out; nothing here reads a hook or knows about weeks
 * beyond the one choice it is given.
 */

/** The shifts and constraints one week uses, by id. */
export type WeekChoiceIds = {
	shiftIds: Array<string>;
	constraintIds: Array<string>;
};

/** Why a constraint can't be chosen, shown under its name. */
export type ConstraintChoiceNote =
	| { kind: "locked" }
	| { kind: "leavesOut"; shiftNames: Array<string> }
	| { kind: "shiftGone" };

/** What stops a week's choice from rostering anyone. */
export type WeekChoiceProblem = "noShift" | "noStaffing";

/** How much of the department's setup the week uses. */
export type UsesSummary = {
	shiftsChosen: number;
	shiftsTotal: number;
	constraintsChosen: number;
	constraintsTotal: number;
};

/** A shift as the choice needs it. */
export type ChoiceShift = Pick<ScheduleShift, "shiftId">;

/** A constraint as the choice needs it; `requiresPeople` comes from the live lists only. */
export type ChoiceConstraint = Pick<
	Constraint,
	"constraintId" | "status" | "locked" | "overriddenByConstraintId" | "values"
> & { requiresPeople?: boolean };

/**
 * The constraints a week can use: not one a department replacement stands in
 * for, and not inactive. A frozen copy has no status and is always listed.
 */
export const listedConstraints = <Row extends ChoiceConstraint>(
	constraints: Array<Row>
): Array<Row> =>
	constraints.filter(
		(constraint) =>
			!constraint.overriddenByConstraintId &&
			(constraint.status === undefined || isTickable(constraint))
	);

/** The shift ids a constraint names. */
const shiftValuesOf = (
	constraint: ChoiceConstraint
): ChoiceConstraint["values"] =>
	constraint.values.filter((value) => value.field === "SHIFT");

/** Whether every shift the constraint names is among `shiftIds`, as the API's freeze requires. */
export const usableWith = (
	constraint: ChoiceConstraint,
	shiftIds: Array<string>
): boolean =>
	shiftValuesOf(constraint).every((value) => shiftIds.includes(value.value));

/** Everything: every shift, every listed constraint usable with them, and every locked one. */
export const allOf = (
	shifts: Array<ChoiceShift>,
	constraints: Array<ChoiceConstraint>
): WeekChoiceIds => {
	const shiftIds = shifts.map((shift) => shift.shiftId);
	const constraintIds = listedConstraints(constraints)
		.filter(
			(constraint) => constraint.locked || usableWith(constraint, shiftIds)
		)
		.map((constraint) => constraint.constraintId);
	return { shiftIds, constraintIds };
};

/** The choice with these shifts, dropping the constraints they leave unusable; locked ones stay. */
export const withShiftsChosen = (
	choice: WeekChoiceIds,
	shiftIds: Array<string>,
	constraints: Array<ChoiceConstraint>
): WeekChoiceIds => ({
	shiftIds,
	constraintIds: choice.constraintIds.filter((constraintId) =>
		constraints.some(
			(constraint) =>
				constraint.constraintId === constraintId &&
				(constraint.locked || usableWith(constraint, shiftIds))
		)
	),
});

/**
 * Why a constraint can't be chosen this week: it is locked, it names a shift
 * no longer listed, or it names shifts the week leaves out (by their names).
 */
export const noteOf = (
	constraint: ChoiceConstraint,
	chosenShiftIds: Array<string>,
	listedShiftIds: Array<string>
): ConstraintChoiceNote | undefined => {
	if (constraint.locked) return { kind: "locked" };
	const named = shiftValuesOf(constraint);
	if (named.some((value) => !listedShiftIds.includes(value.value)))
		return { kind: "shiftGone" };
	const leftOut = named.filter(
		(value) => !chosenShiftIds.includes(value.value)
	);
	if (leftOut.length === 0) return undefined;
	return {
		kind: "leavesOut",
		shiftNames: leftOut.map((value) => value.name ?? value.value),
	};
};

/** Whether the manager may tick or untick it: not locked, and usable with the chosen shifts. */
export const isSelectable = (
	constraint: ChoiceConstraint,
	shiftIds: Array<string>
): boolean => !constraint.locked && usableWith(constraint, shiftIds);

/** What stops the choice from rostering anyone: no shift, or no chosen constraint that requires people. */
export const weekChoiceProblem = (
	choice: WeekChoiceIds,
	constraints: Array<ChoiceConstraint>
): WeekChoiceProblem | undefined => {
	if (choice.shiftIds.length === 0) return "noShift";
	const staffed = constraints.some(
		(constraint) =>
			constraint.requiresPeople === true &&
			choice.constraintIds.includes(constraint.constraintId)
	);
	return staffed ? undefined : "noStaffing";
};

/** How many of the listed shifts and constraints the choice uses. */
export const usesSummary = (
	choice: WeekChoiceIds,
	shifts: Array<ChoiceShift>,
	constraints: Array<ChoiceConstraint>
): UsesSummary => {
	const listed = listedConstraints(constraints);
	return {
		shiftsChosen: shifts.filter((shift) =>
			choice.shiftIds.includes(shift.shiftId)
		).length,
		shiftsTotal: shifts.length,
		constraintsChosen: listed.filter((constraint) =>
			choice.constraintIds.includes(constraint.constraintId)
		).length,
		constraintsTotal: listed.length,
	};
};
