import type { TFunction } from "i18next";
import type {
	DepartmentConstraint,
	ReachedBranch,
	ReachedDepartment,
} from "@/features/scheduling/constraints/api";
import type { Workspace } from "@/features/workspace/api";
import {
	branchChoices,
	departmentChoices,
	type BranchChoice,
	type DepartmentChoice,
} from "@/features/workspace/unitChoices";

/*
 * Where a work-policy constraint applies (ADR-0072): the whole company,
 * chosen Branches (every Department in them, now and later) or chosen
 * Departments. The API sends the chosen units by name; these helpers turn
 * them into the dialog's choice and into words for a list.
 */

/** The three reach choices, in the order the dialog offers them. */
export const POLICY_REACHES = ["COMPANY", "BRANCHES", "DEPARTMENTS"] as const;

/** Whole company, chosen Branches, or chosen Departments. */
export type PolicyReach = (typeof POLICY_REACHES)[number];

/** What the dialog may offer to choose from: the company's Branches and its Departments with their Branches. */
export type PolicyReachChoices = {
	branches: Array<BranchChoice>;
	departments: Array<DepartmentChoice>;
};

/** What the Applies to field holds: the choice, and the picks of both kinds so switching back restores them. */
export type PolicyReachValue = {
	appliesTo: PolicyReach;
	branchIds: Array<string>;
	departmentIds: Array<string>;
};

/** The reach a constraint carries; a Department's own reads as the whole company, since it names no unit. */
type ReachRow = Pick<
	DepartmentConstraint,
	"appliesToBranches" | "appliesToDepartments"
>;

/** Which of the three choices a constraint's reach is. */
export const reachOf = (constraint: ReachRow): PolicyReach => {
	if (constraint.appliesToDepartments.length > 0) return "DEPARTMENTS";
	if (constraint.appliesToBranches.length > 0) return "BRANCHES";
	return "COMPANY";
};

/** The Applies to field's starting value: an edited constraint's reach, or the whole company for a new one. */
export const reachValueOf = (constraint?: ReachRow): PolicyReachValue => ({
	appliesTo: constraint ? reachOf(constraint) : "COMPANY",
	branchIds: (constraint?.appliesToBranches ?? []).map(
		(branch) => branch.branchId
	),
	departmentIds: (constraint?.appliesToDepartments ?? []).map(
		(department) => department.departmentId
	),
});

/**
 * The units a dialog's reach names, as a saved constraint carries them, so its
 * preview reads where the constraint will apply before it is saved. Only the
 * chosen kind's units count; the whole company names none.
 */
export const reachedUnitsOf = (
	value: PolicyReachValue,
	choices: PolicyReachChoices
): {
	appliesToBranches: Array<ReachedBranch>;
	appliesToDepartments: Array<ReachedDepartment>;
} => ({
	appliesToBranches:
		value.appliesTo === "BRANCHES"
			? choices.branches
					.filter((branch) => value.branchIds.includes(branch.branchId))
					.map((branch) => ({
						branchId: branch.branchId,
						branchName: branch.name,
					}))
			: [],
	appliesToDepartments:
		value.appliesTo === "DEPARTMENTS"
			? choices.departments
					.filter((department) =>
						value.departmentIds.includes(department.departmentId)
					)
					.map((department) => ({
						departmentId: department.departmentId,
						departmentName: department.name,
						branchId: department.branchId,
						branchName: department.branchName,
					}))
			: [],
});

/** The reach in words: "All departments", "Orchard (branch)", or "Bar, Kitchen". */
export const reachLabel = (constraint: ReachRow, t: TFunction): string => {
	const key = "scheduling.policy.reach";
	switch (reachOf(constraint)) {
		case "DEPARTMENTS":
			return constraint.appliesToDepartments
				.map((department) => department.departmentName)
				.join(", ");
		case "BRANCHES":
			return constraint.appliesToBranches
				.map((branch) => t(`${key}.branch`, { name: branch.branchName }))
				.join(", ");
		case "COMPANY":
			return t(`${key}.wholeCompany`);
	}
};

/**
 * Every Branch and Department of the company a work-policy editor may choose,
 * inactive ones too: the API accepts any live unit, and a Branch closed for a
 * season keeps its constraints. The key is held company-wide, so every unit
 * the workspace lists is offered.
 */
export const reachChoicesOf = (
	workspace: Workspace,
	companyId: string
): PolicyReachChoices => ({
	branches: branchChoices(workspace, companyId, ["scheduling_policy:update"]),
	departments: departmentChoices(workspace, companyId, [
		"scheduling_policy:update",
	]),
});
