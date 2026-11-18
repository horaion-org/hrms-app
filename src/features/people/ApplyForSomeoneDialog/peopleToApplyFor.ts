/**
 * A person an area's list names; a removed member has no name and is never
 * offered. The rest tells people with the same name apart, as far as the
 * area's list carries it.
 */
export type PersonToApplyFor = {
	membershipId: string;
	displayName: string | null;
	departmentId?: string | null;
	departmentName?: string | null;
	jobTitleName?: string | null;
	employeeCode?: string | null;
};

/** A Department as a page's units name it. */
type NamedDepartment = { departmentId: string; name: string };

/** The line under a person's name: Department, job title and employee code, those known, joined by " · "; none when nothing is known. */
export const personDescription = (
	person: PersonToApplyFor
): string | undefined => {
	const parts = [
		person.departmentName,
		person.jobTitleName,
		person.employeeCode,
	].filter((part): part is string => Boolean(part));
	return parts.length > 0 ? parts.join(" · ") : undefined;
};

/** The people with their Department's name from `departments` where their own list did not carry one. */
export const withDepartmentNames = <Person extends PersonToApplyFor>(
	people: ReadonlyArray<Person>,
	departments: ReadonlyArray<NamedDepartment>
): Array<Person> =>
	people.map((person) => ({
		...person,
		departmentName:
			person.departmentName ??
			departments.find(
				(department) => department.departmentId === person.departmentId
			)?.name ??
			null,
	}));

/** A person who may be offered: one with a name. */
type NamedPerson<Person extends PersonToApplyFor> = Person & {
	displayName: string;
};

/** Whether `name` holds `search`, ignoring case and the spaces around the search; a blank search matches any name. */
const nameHolds = (name: string, search: string): boolean =>
	name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());

/**
 * The people offered to apply for, in the list's order: those still named,
 * whom `maySetFor` allows, and whose name holds `search`.
 */
export const peopleToApplyFor = <Person extends PersonToApplyFor>(
	people: ReadonlyArray<Person>,
	search: string,
	maySetFor: (person: Person) => boolean
): Array<NamedPerson<Person>> =>
	people.filter(
		(person): person is NamedPerson<Person> =>
			person.displayName !== null &&
			maySetFor(person) &&
			nameHolds(person.displayName, search)
	);
