import type { TFunction } from "i18next";
import type { Branch, Department } from "@/features/organisation/api";
import { placeOf } from "@/features/organisation/assignmentTargets";

/**
 * A Department a person may act in, named with its Branch because
 * Department names repeat across Branches.
 */
export type DepartmentChoice = {
	department: Department;
	/** Undefined when the Branch is not among those loaded. */
	branch: Branch | undefined;
	label: string;
};

/**
 * The Departments where `allowed` says the person may act, e.g. where they
 * hold a create key, each with its Branch and its name in words.
 */
export const departmentChoices = (
	branches: ReadonlyArray<Branch>,
	departments: ReadonlyArray<Department>,
	allowed: (departmentId: string) => boolean,
	t: TFunction
): Array<DepartmentChoice> =>
	departments
		.filter((department) => allowed(department.departmentId))
		.map((department) => {
			const branch = branches.find(
				(item) => item.branchId === department.branchId
			);
			return {
				department,
				branch,
				label: placeOf(
					{ branchName: branch?.name, departmentName: department.name },
					t
				),
			};
		});
