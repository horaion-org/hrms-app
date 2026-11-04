import type { Workspace } from "@/features/workspace/api";
import type { UnitSelection } from "@/features/workspace/unitSearch";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import {
	branchChoices,
	chosenBranch,
	departmentChoices,
	type BranchChoice,
	type DepartmentChoice,
} from "@/features/workspace/unitChoices";

export type { UnitSelection };

/**
 * How one level of a unit selector shows: a choice, the one unit in reach
 * as text, a choice that waits for a Branch, or nothing.
 */
export type UnitLevelMode = "select" | "static" | "disabled" | "hidden";

/**
 * The URL's name for "All branches" on a page that starts on its first
 * Branch, where leaving `branch` out already means that first Branch.
 * Never sent to the API.
 */
export const ALL_BRANCHES = "all";

export type UnitSelectionRules = {
	/** Offers "All branches", the default unless `startOnFirstBranch`; otherwise the first Branch is shown. */
	allowAllBranches: boolean;
	/** With `allowAllBranches`: still opens on the first Branch, and names "All branches" in the URL as `ALL_BRANCHES`. */
	startOnFirstBranch?: boolean;
	/** Offers a Department level beneath the Branch. */
	withDepartment: boolean;
};

/** What a unit selector shows and what its list asks for, worked out from the offered units. */
export type ResolvedUnitSelection = {
	rules: UnitSelectionRules;
	/** The Branch shown; undefined for every Branch (only with `allowAllBranches`) or none offered. */
	branch: BranchChoice | undefined;
	/** The Department shown; undefined for every Department of the Branch. */
	department: DepartmentChoice | undefined;
	branches: ReadonlyArray<BranchChoice>;
	/** The offered Departments of the Branch shown; none while every Branch is shown. */
	departments: ReadonlyArray<DepartmentChoice>;
	branchMode: UnitLevelMode;
	departmentMode: UnitLevelMode;
};

/**
 * A single Branch is text only where there is no "All" to choose: "All
 * branches" also lists members filed under no Department, so it is not the
 * same as the one Branch.
 */
const branchModeOf = (
	branches: ReadonlyArray<BranchChoice>,
	{ allowAllBranches }: UnitSelectionRules
): UnitLevelMode => {
	if (branches.length === 0) return "hidden";
	if (branches.length === 1 && !allowAllBranches) return "static";
	return "select";
};

/** Inside one Branch, every offered Department is what "All departments" lists, so one is text. */
const departmentModeOf = (
	branch: BranchChoice | undefined,
	branches: ReadonlyArray<BranchChoice>,
	departments: ReadonlyArray<DepartmentChoice>,
	{ withDepartment }: UnitSelectionRules
): UnitLevelMode => {
	if (!withDepartment || branches.length === 0) return "hidden";
	if (!branch) return "disabled";
	if (departments.length === 0) return "hidden";
	return departments.length === 1 ? "static" : "select";
};

/** Whether the page shows every Branch when the URL names none it offers. */
const defaultsToAllBranches = (rules: UnitSelectionRules): boolean =>
	rules.allowAllBranches && !rules.startOnFirstBranch;

/**
 * The Branch shown: the requested one when offered, every Branch when
 * "All branches" is requested and allowed, else the page's default (every
 * Branch, or the first).
 */
const branchShown = (
	branches: ReadonlyArray<BranchChoice>,
	requestedBranchId: string | undefined,
	rules: UnitSelectionRules
): BranchChoice | undefined =>
	rules.allowAllBranches && requestedBranchId === ALL_BRANCHES
		? undefined
		: chosenBranch(branches, requestedBranchId, defaultsToAllBranches(rules));

/**
 * Resolves the requested units against the offered ones: a Branch no longer
 * offered falls back to the default (every Branch, or the first), and a
 * Department outside the Branch shown is dropped.
 */
export const resolveUnitSelection = (
	branches: ReadonlyArray<BranchChoice>,
	departments: ReadonlyArray<DepartmentChoice>,
	requested: UnitSelection,
	rules: UnitSelectionRules
): ResolvedUnitSelection => {
	const branch = branchShown(branches, requested.branchId, rules);
	const departmentsOfBranch = branch
		? departments.filter(
				(department) => department.branchId === branch.branchId
			)
		: [];
	const department = rules.withDepartment
		? departmentsOfBranch.find(
				(choice) => choice.departmentId === requested.departmentId
			)
		: undefined;
	return {
		rules,
		branch,
		department,
		branches,
		departments: departmentsOfBranch,
		branchMode: branchModeOf(branches, rules),
		departmentMode: departmentModeOf(
			branch,
			branches,
			departmentsOfBranch,
			rules
		),
	};
};

/** `resolveUnitSelection` over the units the workspace offers for `keys`; nothing offered without a workspace. */
export const resolveWorkspaceUnits = (
	workspace: Workspace | undefined,
	companyId: string,
	keys: ReadonlyArray<PermissionKey>,
	requested: UnitSelection,
	rules: UnitSelectionRules
): ResolvedUnitSelection =>
	resolveUnitSelection(
		workspace ? branchChoices(workspace, companyId, keys) : [],
		workspace ? departmentChoices(workspace, companyId, keys) : [],
		requested,
		rules
	);

/** The units the list asks the API for: the resolved Branch and Department ids, none for every one. */
export const selectedUnits = ({
	branch,
	department,
}: ResolvedUnitSelection): UnitSelection => ({
	branchId: branch?.branchId,
	departmentId: department?.departmentId,
});

/**
 * The units as the URL names them: the API's ids, except that "All
 * branches" on a page starting on its first Branch is `ALL_BRANCHES`.
 */
export const urlUnitsOf = (resolved: ResolvedUnitSelection): UnitSelection => {
	const units = selectedUnits(resolved);
	return units.branchId === undefined && resolved.rules.startOnFirstBranch
		? { ...units, branchId: ALL_BRANCHES }
		: units;
};

/** Whether two selections name the same units. */
export const sameUnits = (
	first: UnitSelection,
	second: UnitSelection
): boolean =>
	first.branchId === second.branchId &&
	first.departmentId === second.departmentId;

/** Whether the units differ from the page's default; a Branch the page must show is never a filter. */
export const unitsNarrowed = (resolved: ResolvedUnitSelection): boolean => {
	const { rules, branch, branches, department } = resolved;
	if (department !== undefined) return true;
	if (!rules.allowAllBranches) return false;
	return rules.startOnFirstBranch
		? branch?.branchId !== branches[0]?.branchId
		: branch !== undefined;
};

/** The units "Clear filters" goes back to: the page's default Branch, or the Branch the page must show. */
export const clearedUnits = (resolved: ResolvedUnitSelection): UnitSelection =>
	resolved.rules.allowAllBranches
		? {}
		: { branchId: resolved.branch?.branchId };
