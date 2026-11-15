import type { TFunction } from "i18next";
import type { ConstraintValueProblem } from "@/features/scheduling/constraints/api";

/*
 * What a rule's stored values that no longer fit mean to the manager (the
 * API's ADR-0085): the API judges each value, the app only words it.
 */

/** A stored value as the lists show it, with why it no longer fits when the API says so. */
export type ValueWithProblem = {
	value: string;
	name: string | null;
	problem?: ConstraintValueProblem | null;
};

/** Whether any of a rule's values no longer fits, so the rule needs attention. */
export const needsAttention = (
	values: ReadonlyArray<ValueWithProblem>
): boolean => values.some((value) => Boolean(value.problem));

/** One line per value that no longer fits, saying what is wrong and what to do. */
export const problemLines = (
	values: ReadonlyArray<ValueWithProblem>,
	t: TFunction
): Array<string> =>
	values.flatMap((value) =>
		value.problem
			? [
					t(`scheduling.constraints.problems.${value.problem}`, {
						name: value.name ?? value.value,
					}),
				]
			: []
	);
