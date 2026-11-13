import {
	COMPANY_SCOPE,
	branchScope,
	departmentScope,
	type ScopeRef,
} from "@/features/workspace/scopes";
import {
	UNIT_REACHES,
	type UnitReach,
	type UnitReachChoices,
} from "@/features/workspace/unitReach";

/** The Applies to choices a person may save, and the units each offers. */
export type ManageableReach = {
	reaches: ReadonlyArray<UnitReach>;
	choices: UnitReachChoices;
};

/**
 * The Applies to choices a person may save for a leave duration (the API's
 * coverage rule, ADR-0077): the whole company only with the key
 * company-wide; chosen Branches with the Branches where they hold it; chosen
 * Departments with the Departments where they hold it. Callers pass
 * `(target) => access.can("leave_duration:update", target)`. A reach with no
 * unit to offer is left out, so a department admin is offered only their own
 * Departments.
 */
export const manageableReach = (
	choices: UnitReachChoices,
	can: (target: ScopeRef) => boolean
): ManageableReach => {
	const branches = choices.branches.filter((branch) =>
		can(branchScope(branch.branchId))
	);
	const departments = choices.departments.filter((department) =>
		can(departmentScope(department.departmentId))
	);
	const offered: Record<UnitReach, boolean> = {
		COMPANY: can(COMPANY_SCOPE),
		BRANCHES: branches.length > 0,
		DEPARTMENTS: departments.length > 0,
	};
	return {
		reaches: UNIT_REACHES.filter((reach) => offered[reach]),
		choices: { branches, departments },
	};
};
