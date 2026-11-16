import type {
	ConstraintCategory,
	ConstraintType,
	ConstraintTypeOption,
} from "@/features/scheduling/constraints/api";

/** One category of the chooser and the kinds offered under it, in the API's order. */
export type ConstraintTypeGroup = {
	category: ConstraintCategory;
	types: Array<ConstraintTypeOption>;
};

/**
 * The kinds a constraint may be, grouped by their category, both in the order
 * the API lists them: the API decides what is offered and how it is grouped.
 * A kind the system adds is never offered, except the one being shown.
 */
export const typeGroupsOf = (
	types: ReadonlyArray<ConstraintTypeOption>,
	shownType?: ConstraintType | string
): Array<ConstraintTypeGroup> =>
	types
		.filter((option) => !option.addedBySystem || option.type === shownType)
		.reduce<Array<ConstraintTypeGroup>>((groups, option) => {
			const group = groups.find((each) => each.category === option.category);
			if (group) group.types.push(option);
			else groups.push({ category: option.category, types: [option] });
			return groups;
		}, []);
