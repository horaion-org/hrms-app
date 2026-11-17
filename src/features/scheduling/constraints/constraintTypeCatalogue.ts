import type { ParseKeys } from "i18next";
import type { Heroicon } from "@/common/types";
import {
	BreakIcon,
	CrossIcon,
	GenerateScheduleIcon,
	GridIcon,
	HistoryIcon,
	PeopleIcon,
	PhoneIcon,
	SchedulingIcon,
	SwapIcon,
	TableIcon,
	TimeIcon,
} from "@/components/ui/Icon";
import {
	PATTERN_DAYS,
	type ConstraintField,
	type ConstraintType,
} from "@/features/scheduling/constraints/api";

/*
 * One record per constraint type: everything the app itself knows about a
 * type, in one place. What a type takes (its category, fields and ranges)
 * comes from the API's constraint options; its words live in the
 * translations under `scheduling.constraints.*.<TYPE>`; its sentence is
 * `sentencePartsOf`. `constraintTypeCatalogue.test.ts` checks that every
 * type has all of these.
 */

/** What the app knows about one constraint type. */
export type ConstraintTypeDeclaration = {
	/** The icon it is offered and listed with; a retired type has none and shows the generic icon. */
	icon?: Heroicon;
	/**
	 * Kept by the API only so a schedule generated with one still reads its
	 * sentence: never offered, added or edited (ADR-0099 in the API).
	 */
	retired?: boolean;
	/** Its fields in the order its sentence reads them, so a manager fills them in as they would say it. */
	fieldReadingOrder: ReadonlyArray<ConstraintField>;
	/** Counted on the shifts it names; every other type applies to everyone rostered. */
	countedOnShifts?: boolean;
	/** Only ever If possible before firmness was offered, so a new one starts If possible rather than Must. */
	startsIfPossible?: boolean;
	/** The hint under Must or If possible while Must is chosen, when Must is a poor fit for some people. */
	mustHintKey?: ParseKeys;
	/** Every name the engine reports its rule by, so a finding or roster check names it as this type. */
	engineRuleNames: ReadonlyArray<string>;
};

const CATALOGUE = {
	SHIFT_STAFFING: {
		icon: PeopleIcon,
		fieldReadingOrder: ["SHIFT", "COMPARISON", "HEADCOUNT", "JOB_TITLE"],
		countedOnShifts: true,
		engineRuleNames: ["shift_demand_requirement"],
	},
	SHIFT_STAFFING_WITH_STAND_INS: {
		icon: SwapIcon,
		fieldReadingOrder: [
			"SHIFT",
			"HEADCOUNT",
			"JOB_TITLE",
			"STAND_INS_PER_PERSON",
			"STAND_IN_JOB_TITLE",
		],
		countedOnShifts: true,
		engineRuleNames: ["shift_demand_with_substitutes"],
	},
	// On duty throughout gave way to shift staffing (ADR-0128 in the API).
	ROLE_PRESENCE: {
		retired: true,
		fieldReadingOrder: ["SHIFT", "COMPARISON", "HEADCOUNT", "JOB_TITLE"],
		countedOnShifts: true,
		engineRuleNames: ["shift_presence_requirement"],
	},
	DAYS_OFF_PER_PERIOD: {
		icon: SchedulingIcon,
		fieldReadingOrder: ["COMPARISON", "DAYS_OFF", "PERIOD_WEEKS"],
		engineRuleNames: ["off_requirement_per_horizon"],
	},
	AVOID_DAYS_OFF_ON: {
		icon: CrossIcon,
		fieldReadingOrder: ["WEEKDAY"],
		startsIfPossible: true,
		engineRuleNames: ["avoid_off_on_weekdays"],
	},
	REST_BETWEEN_SHIFTS: {
		icon: BreakIcon,
		fieldReadingOrder: ["REST_HOURS"],
		engineRuleNames: ["minimum_rest_between_shifts"],
	},
	BANNED_SHIFT_PATTERN: {
		icon: CrossIcon,
		fieldReadingOrder: PATTERN_DAYS,
		engineRuleNames: ["consecutive_day_work_patterns"],
	},
	MAX_DAYS_WITHOUT_DAY_TYPES: {
		icon: HistoryIcon,
		fieldReadingOrder: ["DAYS_IN_A_ROW", "DAY_TYPE"],
		engineRuleNames: ["max_days_without_day_types"],
	},
	DAY_TYPE_DAYS_PER_WEEK: {
		icon: TableIcon,
		fieldReadingOrder: ["COMPARISON", "DAY_TYPE_COUNT", "DAY_TYPE"],
		engineRuleNames: ["days_of_day_types_per_period"],
	},
	MAX_WORK_HOURS_PER_DAY: {
		icon: TimeIcon,
		fieldReadingOrder: ["WORK_HOURS_A_DAY"],
		engineRuleNames: ["max_work_hours_per_day", "most_minutes_a_day"],
	},
	MAX_OVERTIME_HOURS_PER_MONTH: {
		icon: HistoryIcon,
		fieldReadingOrder: ["OVERTIME_HOURS_A_MONTH"],
		engineRuleNames: [
			"max_overtime_hours_per_month",
			"most_overtime_minutes_a_month",
		],
	},
	// The shortest part of a shift around leave gave way to each leave duration's own shift choice.
	SHORTEST_PART_SHIFT: {
		retired: true,
		fieldReadingOrder: ["PART_SHIFT_MINUTES"],
		engineRuleNames: ["shortest_part_shift"],
	},
	MAX_CALL_BACKS_PER_PERSON: {
		icon: PhoneIcon,
		fieldReadingOrder: ["CALL_BACKS", "CALL_BACK_SPAN_DAYS"],
		engineRuleNames: ["most_call_backs_per_person"],
	},
	// Pay rates moved onto employment terms (ADR-0123 in the API).
	PAY_RATES: {
		retired: true,
		fieldReadingOrder: [
			"OVERTIME_PERCENT",
			"REST_DAY_WORK_PERCENT",
			"DAY_OFF_WORK_PERCENT",
		],
		engineRuleNames: [],
	},
	NO_OVERTIME_WHEN_GENERATING: {
		icon: GenerateScheduleIcon,
		fieldReadingOrder: [],
		engineRuleNames: ["no_extra_hours_when_generating"],
	},
	OVERTIME_STRETCH: {
		icon: TimeIcon,
		fieldReadingOrder: ["STRETCH_HOURS"],
		engineRuleNames: [],
	},
	KEEP_DAYS_OFF_TOGETHER: {
		icon: GridIcon,
		fieldReadingOrder: [],
		startsIfPossible: true,
		// As a Must it cannot hold for someone whose available days are scattered.
		mustHintKey:
			"scheduling.constraints.dialog.firmnessHints.KEEP_DAYS_OFF_TOGETHER",
		engineRuleNames: ["days_not_worked_together"],
	},
} as const satisfies Record<ConstraintType, ConstraintTypeDeclaration>;

/** Every constraint type's record; a type missing here fails to compile. */
export const CONSTRAINT_TYPE_CATALOGUE: Readonly<
	Record<ConstraintType, ConstraintTypeDeclaration>
> = CATALOGUE;

/** The types whose record says `retired: true`. */
type RetiredConstraintType = {
	[Type in ConstraintType]: (typeof CATALOGUE)[Type] extends { retired: true }
		? Type
		: never;
}[ConstraintType];

/** A type's record; undefined only for a name this app does not know, such as one a newer API adds. */
const declarationOf = (
	type: ConstraintType
): ConstraintTypeDeclaration | undefined => CONSTRAINT_TYPE_CATALOGUE[type];

/** Whether a type is only read, never offered. */
export const isRetiredConstraintType = (
	type: ConstraintType
): type is RetiredConstraintType => declarationOf(type)?.retired === true;

/** Whether a type is counted on the shifts it names, rather than applying to everyone rostered. */
export const isCountedOnShifts = (type: ConstraintType): boolean =>
	declarationOf(type)?.countedOnShifts === true;

/** Whether a new constraint of this type starts If possible rather than Must. */
export const startsIfPossible = (type: ConstraintType): boolean =>
	declarationOf(type)?.startsIfPossible === true;

/** A type's fields in the order its sentence reads them; none for a type the app does not know. */
export const fieldReadingOrderOf = (
	type: ConstraintType
): ReadonlyArray<ConstraintField> =>
	declarationOf(type)?.fieldReadingOrder ?? [];
