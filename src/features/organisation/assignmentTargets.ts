import type { TFunction } from "i18next";
import type { Branch, DepartmentUnit } from "@/features/organisation/api";

/** A place an access role can apply: the whole company, a Branch, or a Department. */
export type AssignmentTarget = {
	label: string;
	branchId?: string;
	departmentId?: string;
};

/** Every place a role can apply, widest first: the company, then each Branch followed by its Departments. */
export const assignmentTargets = (
	branches: ReadonlyArray<Branch>,
	departments: ReadonlyArray<DepartmentUnit>,
	t: TFunction
): Array<AssignmentTarget> => [
	{ label: t("organisation.accessRoles.assignments.wholeCompany") },
	...branches.flatMap((branch) => [
		{ label: branch.name, branchId: branch.branchId },
		...departments
			.filter((department) => department.branchId === branch.branchId)
			.map((department) => ({
				label: t("organisation.accessRoles.assignments.department", {
					branch: branch.name,
					department: department.name,
				}),
				branchId: branch.branchId,
				departmentId: department.departmentId,
			})),
	]),
];
