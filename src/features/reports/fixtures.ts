import type {
	RosterChangeDepartment,
	StaffingRule,
} from "@/features/reports/api";

/** Front desk's rule: 3 needed on each shift, 2 people hold the titles. */
export const staffingRuleFixture = (
	overrides: Partial<StaffingRule> = {}
): StaffingRule => ({
	departmentId: "d-1",
	departmentName: "Front desk",
	branchName: "Main branch",
	ruleName: "Front desk AM",
	ruleType: "SHIFT_STAFFING",
	headcount: 3,
	jobTitles: [
		{ jobTitleId: "jt-clerk", name: "Clerk" },
		{ jobTitleId: "jt-lead", name: "Lead" },
	],
	peopleWithTitles: 2,
	shifts: [{ shiftId: "sh-am", name: "Morning", daysAWeek: 7 }],
	gapsInRange: 9,
	...overrides,
});

/** Sales changed its published rosters four times in two weeks. */
export const rosterChangeDepartmentFixture = (
	overrides: Partial<RosterChangeDepartment> = {}
): RosterChangeDepartment => ({
	branchId: "b-1",
	branchName: "Main branch",
	departmentId: "d-1",
	departmentName: "Sales",
	publishedWeeks: 2,
	totalChanges: 4,
	reasons: [
		{ reason: "MANUAL", changes: 3, days: 5 },
		{ reason: "LEAVE_APPROVED", changes: 1, days: 1 },
	],
	...overrides,
});
