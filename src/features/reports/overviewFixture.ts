import {
	overtimeFixture,
	shortageFixture,
	staffingRuleFixture,
} from "@/features/dashboard/fixtures";
import { rosterChangeDepartmentFixture } from "@/features/reports/fixtures";
import { overviewOf, type Overview } from "@/features/reports/overview";

/**
 * Two Branches for stories and tests: North Point, short every day under a
 * rule nobody can staff, and Main branch, with one person over the overtime
 * limit and its coming week published.
 */
export const overviewFixture = (): Overview => {
	const rule = staffingRuleFixture({
		branchName: "North Point",
		departmentId: "d-control",
		departmentName: "Control room",
		ruleName: "Duty Manager Day",
		shifts: [{ shiftId: "sh-am", name: "Morning", daysAWeek: 7 }],
	});
	const short = (day: string): ReturnType<typeof shortageFixture> =>
		shortageFixture({
			day,
			branchId: "b-north",
			branchName: "North Point",
			departmentId: "d-control",
			departmentName: "Control room",
		});
	return overviewOf({
		shortages: [short("2026-11-17"), short("2026-11-18"), short("2026-11-19")],
		shortagesBefore: [short("2026-11-10")],
		rules: [rule],
		overtime: overtimeFixture().departments,
		thisMonth: "2026-11",
		nextRoster: [
			{
				branchId: "b-north",
				departmentId: "d-control",
				departmentName: "Control room",
				state: "NOT_GENERATED",
				scheduleId: null,
				step: "generate",
				missing: [],
			},
			{
				branchId: "b-1",
				departmentId: "d-1",
				departmentName: "Sales",
				state: "PUBLISHED",
				scheduleId: "s-1",
				step: "done",
				missing: [],
			},
		],
		rostersInReach: true,
		changes: [rosterChangeDepartmentFixture()],
		changesBefore: [rosterChangeDepartmentFixture({ totalChanges: 1 })],
		grouping: "branch",
		branchNameOf: (branchId) =>
			branchId === "b-north" ? "North Point" : "Main branch",
	});
};
