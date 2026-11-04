import type { UnitSelectionRules } from "@/features/workspace/unitSelection";

/** Departments are listed across every Branch in reach unless one is chosen; Department is the row itself. */
export const DEPARTMENTS_UNIT_RULES: UnitSelectionRules = {
	allowAllBranches: true,
	withDepartment: false,
};

/** Job titles are listed across every Branch in reach, then by Department once a Branch is chosen. */
export const JOB_TITLES_UNIT_RULES: UnitSelectionRules = {
	allowAllBranches: true,
	withDepartment: true,
};
