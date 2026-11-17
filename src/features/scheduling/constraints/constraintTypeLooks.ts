import type { TFunction } from "i18next";
import type { Heroicon } from "@/common/types";
import {
	PeopleIcon,
	PlaceholderIcon,
	SchedulingIcon,
	TimeIcon,
} from "@/components/ui/Icon";
import type {
	ConstraintCategory,
	ConstraintType,
} from "@/features/scheduling/constraints/api";
import {
	CONSTRAINT_TYPE_CATALOGUE,
	isRetiredConstraintType,
} from "@/features/scheduling/constraints/constraintTypeCatalogue";

/*
 * How each kind of constraint looks where it is offered or listed: its icon
 * from its catalogue record (`constraintTypeCatalogue.ts`), and its one-line
 * description and example in the translations
 * (`scheduling.constraints.descriptions.<TYPE>` and `.examples.<TYPE>`), beside
 * its label and sentence. Which kinds exist, their category and their fields
 * come from the API's constraint options; this module only dresses them. A
 * kind without an icon shows a generic icon and its label alone.
 */

/** The icon heading each category, where constraints are grouped by what they are for. */
const CATEGORY_ICONS: Partial<Record<ConstraintCategory, Heroicon>> = {
	STAFFING: PeopleIcon,
	SHIFT_PATTERN: SchedulingIcon,
	WORKING_HOURS: TimeIcon,
};

/** How one kind of constraint is shown: its icon, label and, when it has them, what it does and an example. */
export type ConstraintTypeLook = {
	Icon: Heroicon;
	label: string;
	description?: string;
	example?: string;
};

/** The look of a kind of constraint; one with no icon keeps its label and a generic icon. */
export const constraintTypeLookOf = (
	type: ConstraintType,
	t: TFunction
): ConstraintTypeLook => {
	const label = t(`scheduling.constraints.types.${type}`);
	// A name the app has no record for, such as one a newer API adds, has no icon.
	const Icon = CONSTRAINT_TYPE_CATALOGUE[type]?.icon;
	// A retired kind is only read on schedules generated with it, never offered, so it says no more than its label.
	if (!Icon || isRetiredConstraintType(type))
		return { Icon: PlaceholderIcon, label };
	return {
		Icon,
		label,
		description: t(`scheduling.constraints.descriptions.${type}`),
		example: t(`scheduling.constraints.examples.${type}`),
	};
};

/** The icon of a category; a category with no entry gets the generic icon. */
export const categoryIconOf = (category: ConstraintCategory): Heroicon =>
	CATEGORY_ICONS[category] ?? PlaceholderIcon;
