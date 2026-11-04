import type { Workspace } from "@/features/workspace/api";
import type { UnitSelection } from "@/features/workspace/unitSearch";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import {
	branchChoices,
	departmentChoices,
	type BranchChoice,
	type DepartmentChoice,
} from "@/features/workspace/unitChoices";

export type { UnitSelection };

/**
 * How one level of the unit controls shows: a choice, the one unit in
 * reach as text, or nothing.
 */
export type UnitLevelMode = "select" | "static" | "hidden";

/**
 * The URL's name for "All branches", chosen. Leaving `branch` out means no
 * choice, so the person's default Branch shows. Never sent to the API.
 */
export const ALL_BRANCHES = "all";

export type UnitSelectionRules = {
	/** Offers a Department filter: the page lists people or what is filed by Department. */
	withDepartment: boolean;
};

/** What the header and a page's filters show, and what its list asks for, worked out from the offered units. */
export type ResolvedUnitSelection = {
	rules: UnitSelectionRules;
	/** The Branch shown; undefined for every Branch (offered only beyond one) or none offered. */
	branch: BranchChoice | undefined;
	/** The Department shown; undefined for every Department in reach. */
	department: DepartmentChoice | undefined;
	branches: ReadonlyArray<BranchChoice>;
	/** The offered Departments: of the Branch shown, or of every Branch while all are shown. */
	departments: ReadonlyArray<DepartmentChoice>;
	branchMode: UnitLevelMode;
	departmentMode: UnitLevelMode;
};

/** One Branch in reach is text; several are a choice, with "All branches" last. */
const modeOf = (count: number): UnitLevelMode => {
	if (count === 0) return "hidden";
	return count === 1 ? "static" : "select";
};

/** Whether "All branches" is offered: only to someone whose grants span more than one Branch. */
export const offersAllBranches = (
	branches: ReadonlyArray<BranchChoice>
): boolean => branches.length > 1;

/**
 * The Branch shown while nothing is chosen: the person's home Branch when
 * it is offered, else the first offered Branch by name.
 */
export const defaultBranch = (
	branches: ReadonlyArray<BranchChoice>,
	homeBranchId: string | undefined
): BranchChoice | undefined =>
	branches.find((choice) => choice.branchId === homeBranchId) ??
	[...branches].sort((first, second) =>
		first.name.localeCompare(second.name)
	)[0];

/**
 * The Branch shown: every Branch when "All branches" is chosen and
 * offered, the requested Branch when offered, else the default.
 */
const branchShown = (
	branches: ReadonlyArray<BranchChoice>,
	requestedBranchId: string | undefined,
	homeBranchId: string | undefined
): BranchChoice | undefined => {
	if (requestedBranchId === ALL_BRANCHES && offersAllBranches(branches))
		return undefined;
	return (
		branches.find((choice) => choice.branchId === requestedBranchId) ??
		defaultBranch(branches, homeBranchId)
	);
};

/**
 * Resolves the requested units against the offered ones. A Branch not
 * offered falls back to the default; a Department not offered under the
 * Branch shown (or under any Branch while all are shown) is dropped.
 */
export const resolveUnitSelection = (
	branches: ReadonlyArray<BranchChoice>,
	departments: ReadonlyArray<DepartmentChoice>,
	requested: UnitSelection,
	rules: UnitSelectionRules,
	homeBranchId?: string
): ResolvedUnitSelection => {
	const branch = branchShown(branches, requested.branchId, homeBranchId);
	const departmentsShown = branch
		? departments.filter(
				(department) => department.branchId === branch.branchId
			)
		: departments;
	const department = rules.withDepartment
		? departmentsShown.find(
				(choice) => choice.departmentId === requested.departmentId
			)
		: undefined;
	return {
		rules,
		branch,
		department,
		branches,
		departments: departmentsShown,
		branchMode: modeOf(branches.length),
		departmentMode: rules.withDepartment
			? modeOf(departmentsShown.length)
			: "hidden",
	};
};

/** `resolveUnitSelection` over the units the workspace offers for `keys`; nothing offered without a workspace. */
export const resolveWorkspaceUnits = (
	workspace: Workspace | undefined,
	companyId: string,
	keys: ReadonlyArray<PermissionKey>,
	requested: UnitSelection,
	rules: UnitSelectionRules,
	homeBranchId?: string
): ResolvedUnitSelection =>
	resolveUnitSelection(
		workspace ? branchChoices(workspace, companyId, keys) : [],
		workspace ? departmentChoices(workspace, companyId, keys) : [],
		requested,
		rules,
		homeBranchId
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
 * Whether the URL names a Branch the person is not offered; "All branches"
 * and no choice are never stale. The header takes such a Branch out once.
 */
export const staleBranch = (
	resolved: ResolvedUnitSelection,
	requested: UnitSelection
): boolean =>
	requested.branchId !== undefined &&
	requested.branchId !== ALL_BRANCHES &&
	!resolved.branches.some((choice) => choice.branchId === requested.branchId);
