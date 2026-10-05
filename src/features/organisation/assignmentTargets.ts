import type { TFunction } from "i18next";
import type { Branch, Department } from "@/features/organisation/api";

/** A place an access role can apply: the whole company, a Branch, or a Department. */
export type AssignmentTarget = {
	label: string;
	branchId?: string;
	departmentId?: string;
};

/** Identifies a place: its Department, else its Branch, else the whole company. */
export const placeKey = (place: {
	branchId?: string;
	departmentId?: string;
}): string => place.departmentId ?? place.branchId ?? "";

/** A place in words: the whole company, a Branch, or a Branch and its Department. */
export const placeOf = (
	place: { branchName?: string; departmentName?: string },
	t: TFunction
): string => {
	if (!place.branchName)
		return t("organisation.accessRoles.assignments.wholeCompany");
	if (!place.departmentName) return place.branchName;
	return t("organisation.accessRoles.assignments.department", {
		branch: place.branchName,
		department: place.departmentName,
	});
};

/** Every place a role can apply, widest first: the company, then each Branch followed by its Departments. */
export const assignmentTargets = (
	branches: ReadonlyArray<Branch>,
	departments: ReadonlyArray<Department>,
	t: TFunction
): Array<AssignmentTarget> => [
	{ label: placeOf({}, t) },
	...branches.flatMap((branch) => [
		{ label: branch.name, branchId: branch.branchId },
		...departments
			.filter((department) => department.branchId === branch.branchId)
			.map((department) => ({
				label: placeOf(
					{ branchName: branch.name, departmentName: department.name },
					t
				),
				branchId: branch.branchId,
				departmentId: department.departmentId,
			})),
	]),
];
