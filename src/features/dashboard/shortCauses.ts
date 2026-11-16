import type { Shortage, StaffingRule } from "@/features/dashboard/api";
import { staffingCauseOf } from "@/features/dashboard/staffingCause";

/*
 * Why shifts are short, so Home names a cause once instead of listing its
 * every day. A staffing rule that too few people can staff leaves its
 * shifts short every time; no cover fixes that, only changing the rule or
 * the people. Everything else is a one-off gap to cover.
 */

/** A rule too few people can staff, with the shifts it leaves short in the range. */
export type UnstaffableRule = {
	rule: StaffingRule;
	/** How many of its shifts are short in the range. */
	shortShifts: number;
};

/** Short shifts by cause: the rules nobody can staff, then the gaps to cover. */
export type ShortShiftsByCause = {
	unstaffable: Array<UnstaffableRule>;
	gaps: Array<Shortage>;
};

/**
 * Whether a short shift is one of a rule's shifts. A roster holds its own
 * copy of each shift, so the copies' ids differ week to week; the shift's
 * name within the rule's department is what stays the same.
 */
const isShiftOf = (rule: StaffingRule, shortage: Shortage): boolean =>
	rule.departmentId === shortage.departmentId &&
	rule.shifts.some(
		(shift) =>
			shift.shiftId === shortage.shiftId || shift.name === shortage.shiftName
	);

/** The rules too few people can staff: the ones no cover fixes. */
export const unstaffableRulesOf = (
	rules: ReadonlyArray<StaffingRule>
): Array<StaffingRule> =>
	rules.filter((rule) => staffingCauseOf(rule) === "TOO_FEW_PEOPLE");

/** The unstaffable rule a short shift falls under, the first of several; undefined for a gap to cover. */
export const unstaffableRuleOf = (
	shortage: Shortage,
	unstaffableRules: ReadonlyArray<StaffingRule>
): StaffingRule | undefined =>
	unstaffableRules.find((rule) => isShiftOf(rule, shortage));

/**
 * The short shifts grouped by cause. A shift under several unstaffable
 * rules counts under the first; a rule with no short shift is left out.
 */
export const shortShiftsByCause = (
	shortages: ReadonlyArray<Shortage>,
	rules: ReadonlyArray<StaffingRule>
): ShortShiftsByCause => {
	const unstaffableRules = unstaffableRulesOf(rules);
	const shortShiftsOf = new Map<StaffingRule, number>();
	const gaps: Array<Shortage> = [];
	for (const shortage of shortages) {
		const rule = unstaffableRuleOf(shortage, unstaffableRules);
		if (rule) shortShiftsOf.set(rule, (shortShiftsOf.get(rule) ?? 0) + 1);
		else gaps.push(shortage);
	}
	return {
		unstaffable: [...shortShiftsOf].map(([rule, shortShifts]) => ({
			rule,
			shortShifts,
		})),
		gaps,
	};
};
