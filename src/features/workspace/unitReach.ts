import type { TFunction } from "i18next";
import { z } from "zod";
import type { Workspace } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import {
	branchChoices,
	departmentChoices,
	type BranchChoice,
	type DepartmentChoice,
} from "@/features/workspace/unitChoices";

/*
 * Where a company item applies (the API's ADR-0072 and ADR-0077): a
 * work-policy constraint or a leave type reaches the whole company, chosen
 * Branches (every Department in them, now and later) or chosen Departments.
 * The API sends the chosen units by name; these helpers turn them into the
 * dialog's choice and into words for a list.
 */

export const reachedBranchSchema = z.object({
	branchId: z.string(),
	branchName: z.string(),
});

/** A Branch an item applies to, every Department in it now and later. */
export type ReachedBranch = z.infer<typeof reachedBranchSchema>;

export const reachedDepartmentSchema = z.object({
	departmentId: z.string(),
	departmentName: z.string(),
	branchId: z.string(),
	branchName: z.string(),
});

/** A Department an item applies to, with its Branch. */
export type ReachedDepartment = z.infer<typeof reachedDepartmentSchema>;

/** The three reach choices, in the order the dialog offers them. */
export const UNIT_REACHES = ["COMPANY", "BRANCHES", "DEPARTMENTS"] as const;

/** Whole company, chosen Branches, or chosen Departments. */
export type UnitReach = (typeof UNIT_REACHES)[number];

/** What the dialog may offer to choose from: the company's Branches and its Departments with their Branches. */
export type UnitReachChoices = {
	branches: Array<BranchChoice>;
	departments: Array<DepartmentChoice>;
};

/** What the Applies to field holds: the choice, and the picks of both kinds so switching back restores them. */
export type UnitReachValue = {
	appliesTo: UnitReach;
	branchIds: Array<string>;
	departmentIds: Array<string>;
};

/** The Applies to field: a choice, and at least one unit of the chosen kind unless it is the whole company. */
export const unitReachSchema = (
	t: TFunction
): z.ZodType<UnitReachValue, UnitReachValue> =>
	z
		.object({
			appliesTo: z.enum(UNIT_REACHES),
			branchIds: z.array(z.string()),
			departmentIds: z.array(z.string()),
		})
		.superRefine(({ appliesTo, branchIds, departmentIds }, context) => {
			if (appliesTo === "BRANCHES" && branchIds.length === 0)
				context.addIssue({
					code: "custom",
					path: ["branchIds"],
					message: t("workspace.unitReach.branchesRequired"),
				});
			if (appliesTo === "DEPARTMENTS" && departmentIds.length === 0)
				context.addIssue({
					code: "custom",
					path: ["departmentIds"],
					message: t("workspace.unitReach.departmentsRequired"),
				});
		});

/** What a body sends for a reach: only the chosen kind's units; the whole company sends neither. */
export const unitReachBody = ({
	appliesTo,
	branchIds,
	departmentIds,
}: UnitReachValue): {
	appliesToBranchIds: Array<string>;
	appliesToDepartmentIds: Array<string>;
} => ({
	appliesToBranchIds: appliesTo === "BRANCHES" ? branchIds : [],
	appliesToDepartmentIds: appliesTo === "DEPARTMENTS" ? departmentIds : [],
});

/** The reach an item carries; a Department's own constraint reads as the whole company, since it names no unit. */
type ReachRow = {
	appliesToBranches: Array<ReachedBranch>;
	appliesToDepartments: Array<ReachedDepartment>;
};

/** Which of the three choices a constraint's reach is. */
export const reachOf = (constraint: ReachRow): UnitReach => {
	if (constraint.appliesToDepartments.length > 0) return "DEPARTMENTS";
	if (constraint.appliesToBranches.length > 0) return "BRANCHES";
	return "COMPANY";
};

/** The Applies to field's starting value: an edited constraint's reach, or the whole company for a new one. */
export const reachValueOf = (constraint?: ReachRow): UnitReachValue => ({
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
	value: UnitReachValue,
	choices: UnitReachChoices
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
	const key = "workspace.unitReach";
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
 * Every Branch and Department of the company an editor holding `permission`
 * may choose, inactive ones too: the API accepts any live unit, and a Branch
 * closed for a season keeps its items. The work policy's and the leave
 * types' keys are held company-wide, so every unit the workspace lists is
 * offered.
 */
export const reachChoicesOf = (
	workspace: Workspace,
	companyId: string,
	permission: PermissionKey
): UnitReachChoices => ({
	branches: branchChoices(workspace, companyId, [permission]),
	departments: departmentChoices(workspace, companyId, [permission]),
});
