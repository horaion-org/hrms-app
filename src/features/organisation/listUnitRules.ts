import type { UnitSelectionRules } from "@/features/workspace/unitSelection";

/** Departments are listed by Branch; Department is the row itself, so it is no filter. */
export const DEPARTMENTS_UNIT_RULES: UnitSelectionRules = {
	withDepartment: false,
};

/** Job titles are listed by Branch and filtered by Department. */
export const JOB_TITLES_UNIT_RULES: UnitSelectionRules = {
	withDepartment: true,
};
