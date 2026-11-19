import type { RosterChangeDepartment } from "@/features/reports/api";

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
