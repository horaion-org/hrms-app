import type { DepartmentToChoose } from "@/features/people/ApplyForSomeoneDialog";

/** A Department as a page's units offer it. */
type OfferedDepartment = { departmentId: string; name: string };

/**
 * The Departments an application on someone's behalf may narrow its search
 * to: those of the page's units where `allows` holds (the same key the
 * people found are checked against), each once, by name.
 */
export const departmentsToApplyIn = (
	departments: ReadonlyArray<OfferedDepartment>,
	allows: (departmentId: string) => boolean
): Array<DepartmentToChoose> =>
	[
		...new Map(
			departments
				.filter((department) => allows(department.departmentId))
				.map((department) => [department.departmentId, department.name])
		),
	]
		.map(([departmentId, name]) => ({ departmentId, name }))
		.sort((first, second) => first.name.localeCompare(second.name));
