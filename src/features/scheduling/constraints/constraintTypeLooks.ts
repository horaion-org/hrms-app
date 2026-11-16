import type { TFunction } from "i18next";
import type { Heroicon } from "@/common/types";
import {
	BreakIcon,
	CrossIcon,
	GenerateScheduleIcon,
	GridIcon,
	HistoryIcon,
	PeopleIcon,
	PhoneIcon,
	PlaceholderIcon,
	RoleIcon,
	SchedulingIcon,
	SwapIcon,
	TableIcon,
	TimeIcon,
} from "@/components/ui/Icon";
import {
	isRetiredConstraintType,
	type ConstraintCategory,
	type ConstraintType,
} from "@/features/scheduling/constraints/api";

/*
 * How each kind of constraint looks where it is offered or listed: its icon
 * here, and its one-line description and example in the translations
 * (`scheduling.constraints.descriptions.<TYPE>` and `.examples.<TYPE>`), beside
 * its label and sentence. Which kinds exist, their category and their fields
 * come from the API's constraint options; this table only dresses them. A kind
 * without an entry shows a generic icon and its label alone.
 */

/** The icon of each kind of constraint that has words of its own. */
const TYPE_ICONS: Partial<Record<ConstraintType, Heroicon>> = {
	SHIFT_STAFFING: PeopleIcon,
	SHIFT_STAFFING_WITH_STAND_INS: SwapIcon,
	ROLE_PRESENCE: RoleIcon,
	DAYS_OFF_PER_PERIOD: SchedulingIcon,
	AVOID_DAYS_OFF_ON: CrossIcon,
	MAX_DAYS_WITHOUT_DAY_TYPES: HistoryIcon,
	DAY_TYPE_DAYS_PER_WEEK: TableIcon,
	KEEP_DAYS_OFF_TOGETHER: GridIcon,
	REST_BETWEEN_SHIFTS: BreakIcon,
	MAX_WORK_HOURS_PER_DAY: TimeIcon,
	MAX_OVERTIME_HOURS_PER_MONTH: HistoryIcon,
	MAX_CALL_BACKS_PER_PERSON: PhoneIcon,
	PAY_RATES: TableIcon,
	NO_OVERTIME_WHEN_GENERATING: GenerateScheduleIcon,
};

/** The icon heading each category, where constraints are grouped by what they are for. */
const CATEGORY_ICONS: Partial<Record<ConstraintCategory, Heroicon>> = {
	STAFFING: PeopleIcon,
	ROLE_COVERAGE: RoleIcon,
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

/** The look of a kind of constraint; one with no entry keeps its label and a generic icon. */
export const constraintTypeLookOf = (
	type: ConstraintType,
	t: TFunction
): ConstraintTypeLook => {
	const label = t(`scheduling.constraints.types.${type}`);
	const Icon = TYPE_ICONS[type];
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
