import type { DepartmentToChoose } from "@/features/people/ApplyForSomeoneDialog";

/** A Department as a page's units offer it, with its Branch. */
type OfferedDepartment = {
	departmentId: string;
	name: string;
	branchName?: string;
};

/**
 * The Departments an application on someone's behalf may narrow its search
 * to: those of the page's units where `allows` holds (the same key the
 * people found are checked against), each once, by name, with their Branch.
 */
export const departmentsToApplyIn = (
	departments: ReadonlyArray<OfferedDepartment>,
	allows: (departmentId: string) => boolean
): Array<DepartmentToChoose> =>
	[
		...new Map(
			departments
				.filter((department) => allows(department.departmentId))
				.map(({ departmentId, name, branchName }) => [
					departmentId,
					{ departmentId, name, branchName },
				])
		).values(),
	].sort((first, second) => first.name.localeCompare(second.name));
