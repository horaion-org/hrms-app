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

/**
 * The short shifts grouped by cause. A shift under several unstaffable
 * rules counts under the first; a rule with no short shift is left out.
 */
export const shortShiftsByCause = (
	shortages: ReadonlyArray<Shortage>,
	rules: ReadonlyArray<StaffingRule>
): ShortShiftsByCause => {
	const unstaffableRules = rules.filter(
		(rule) => staffingCauseOf(rule) === "TOO_FEW_PEOPLE"
	);
	const shortShiftsOf = new Map<StaffingRule, number>();
	const gaps: Array<Shortage> = [];
	for (const shortage of shortages) {
		const rule = unstaffableRules.find((each) => isShiftOf(each, shortage));
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
