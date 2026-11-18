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

/** The Department choice that narrows nothing. Department ids are UUIDs, so it never names one. */
export const ALL_DEPARTMENTS = "all";

/** A Department the picker may narrow to: one where someone offered is filed. */
export type DepartmentToChoose = { departmentId: string; name: string };

/**
 * The Departments of `offered` (people already allowed), each once, by name;
 * a person filed nowhere, or at a Department with no name known, adds none.
 */
export const departmentChoices = (
	offered: ReadonlyArray<PersonToApplyFor>
): Array<DepartmentToChoose> => {
	const byId = new Map<string, string>();
	for (const { departmentId, departmentName } of offered)
		if (departmentId && departmentName) byId.set(departmentId, departmentName);
	return [...byId]
		.map(([departmentId, name]) => ({ departmentId, name }))
		.sort((first, second) => first.name.localeCompare(second.name));
};

/**
 * The Department the picker shows: the one picked; before any pick, the
 * page's own Department when it is among the choices; else every one.
 */
export const shownDepartment = (
	picked: string | undefined,
	choices: ReadonlyArray<DepartmentToChoose>,
	pageDepartmentId: string | undefined
): string => {
	if (picked !== undefined) return picked;
	const pageChoice = choices.find(
		(choice) => choice.departmentId === pageDepartmentId
	);
	return pageChoice ? pageChoice.departmentId : ALL_DEPARTMENTS;
};

/** Whether `name` holds `search`, ignoring case and the spaces around the search; a blank search matches any name. */
const nameHolds = (name: string, search: string): boolean =>
	name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());

/**
 * The people offered to apply for, in the list's order: those still named,
 * whom `maySetFor` allows, whose name holds `search`, and who are filed at
 * `departmentId` unless it is `ALL_DEPARTMENTS`.
 */
export const peopleToApplyFor = <Person extends PersonToApplyFor>(
	people: ReadonlyArray<Person>,
	search: string,
	maySetFor: (person: Person) => boolean,
	departmentId: string = ALL_DEPARTMENTS
): Array<NamedPerson<Person>> =>
	people.filter(
		(person): person is NamedPerson<Person> =>
			person.displayName !== null &&
			maySetFor(person) &&
			nameHolds(person.displayName, search) &&
			(departmentId === ALL_DEPARTMENTS || person.departmentId === departmentId)
	);
