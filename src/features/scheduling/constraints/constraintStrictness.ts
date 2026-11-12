import type {
	ConstraintRequirement,
	ConstraintTypeOption,
	ConstraintValue,
	FieldStrictness,
	PolicyLock,
} from "@/features/scheduling/constraints/api";

/*
 * Whether a Department's replacement of a company constraint is stricter, the
 * same, looser or not comparable (ADR-0058), worked out as the API does:
 * each field in the direction the API declares for it (`strictness` in
 * `constraint-options`), Must stricter than Should, and the parts combined by
 * dominance. The API is the judge; this lets the dialog say so before saving.
 */

export type Strictness = "STRICTER" | "SAME" | "LOOSER" | "INCOMPARABLE";

/** What is compared of a constraint: its requirement and its values. */
export type ComparedConstraint = {
	requirement: ConstraintRequirement | null;
	values: ReadonlyArray<Pick<ConstraintValue, "field" | "value">>;
};

const ofOrder = (comparison: number, higherIsStricter: boolean): Strictness => {
	if (comparison === 0) return "SAME";
	return comparison > 0 === higherIsStricter ? "STRICTER" : "LOOSER";
};

const ofSets = (parent: Set<string>, candidate: Set<string>): Strictness => {
	const candidateHasAll = [...parent].every((item) => candidate.has(item));
	const parentHasAll = [...candidate].every((item) => parent.has(item));
	if (candidateHasAll && parentHasAll) return "SAME";
	if (candidateHasAll) return "STRICTER";
	return parentHasAll ? "LOOSER" : "INCOMPARABLE";
};

/** The whole is stricter only when no part is looser, and looser only when no part is stricter. */
export const combine = (parts: ReadonlyArray<Strictness>): Strictness => {
	const stricter = parts.includes("STRICTER");
	const looser = parts.includes("LOOSER");
	if (parts.includes("INCOMPARABLE") || (stricter && looser))
		return "INCOMPARABLE";
	if (stricter) return "STRICTER";
	return looser ? "LOOSER" : "SAME";
};

const textsOf = (
	constraint: ComparedConstraint,
	field: string
): Array<string> =>
	constraint.values
		.filter((value) => value.field === field)
		.map((value) => value.value);

const numbers = (
	parent: Array<string>,
	candidate: Array<string>,
	higherIsStricter: boolean
): Strictness =>
	ofOrder(
		Math.sign(Number(candidate[0]) - Number(parent[0])),
		higherIsStricter
	);

const byField = (
	strictness: FieldStrictness,
	comparison: string | undefined,
	parent: Array<string>,
	candidate: Array<string>
): Strictness => {
	switch (strictness) {
		case "HIGHER_IS_STRICTER":
			return numbers(parent, candidate, true);
		case "LOWER_IS_STRICTER":
			return numbers(parent, candidate, false);
		case "FOLLOWS_COMPARISON":
		case "AGAINST_COMPARISON": {
			if (comparison === "EXACTLY")
				return parent[0] === candidate[0] ? "SAME" : "INCOMPARABLE";
			const atLeast = comparison !== "AT_MOST";
			return numbers(
				parent,
				candidate,
				atLeast === (strictness === "FOLLOWS_COMPARISON")
			);
		}
		case "SUPERSET_IS_STRICTER":
			return ofSets(new Set(parent), new Set(candidate));
		case "MUST_MATCH":
			return ofSets(new Set(parent), new Set(candidate)) === "SAME"
				? "SAME"
				: "INCOMPARABLE";
		default:
			// A direction this app does not know yet: leave the decision to the API.
			return "SAME";
	}
};

/** How `candidate` compares with the `parent` it would replace, field by field as `type` declares. */
export const compareStrictness = (
	type: ConstraintTypeOption,
	parent: ComparedConstraint,
	candidate: ComparedConstraint
): Strictness => {
	const comparison = textsOf(parent, "COMPARISON")[0];
	const requirement = type.hasRequirement
		? ofOrder(
				Number(candidate.requirement === "MUST") -
					Number(parent.requirement === "MUST"),
				true
			)
		: "SAME";
	return combine([
		requirement,
		...type.fields.map((spec) =>
			byField(
				spec.strictness,
				comparison,
				textsOf(parent, spec.field),
				textsOf(candidate, spec.field)
			)
		),
	]);
};

/** A locked constraint takes only something at least as strict; a default anything valid. */
export const allowsReplacement = (
	lock: PolicyLock,
	strictness: Strictness
): boolean =>
	lock === "DEFAULT" || strictness === "STRICTER" || strictness === "SAME";
