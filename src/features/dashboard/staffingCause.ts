import type { StaffingRule } from "@/features/dashboard/api";

/**
 * Why a rule's shifts run short: too few people hold its job titles to staff
 * it (a hiring question, which no cover can fix), or one-off gaps such as
 * leave on rosters already made.
 */
export type StaffingCause = "TOO_FEW_PEOPLE" | "ONE_OFF";

/** Whether the people holding a rule's titles cannot staff it, per shift or across the week. */
const hasTooFewPeople = (rule: StaffingRule): boolean =>
	rule.peopleWithTitles < rule.headcount ||
	(rule.holderDaysAWeek !== null &&
		rule.holderDaysAWeek < rule.neededShiftDaysAWeek);

/** A rule's cause of shortage, or undefined when nothing ran short and nothing will. */
export const staffingCauseOf = (
	rule: StaffingRule
): StaffingCause | undefined => {
	if (hasTooFewPeople(rule)) return "TOO_FEW_PEOPLE";
	return rule.gapsInRange > 0 ? "ONE_OFF" : undefined;
};
