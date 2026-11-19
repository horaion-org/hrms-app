import type { TFunction } from "i18next";

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
	/** The Branch of their Department, which tells two Departments of one name apart. */
	branchName?: string | null;
	jobTitleName?: string | null;
	employeeCode?: string | null;
};

/** A Department as a page's units name it. */
type NamedDepartment = {
	departmentId: string;
	name: string;
	branchName?: string;
};

/** Names a Department with its Branch first, as the app writes a place: "Orchard › Kitchen". */
export type BranchFirst = (
	branchName: string,
	departmentName: string
) => string;

/** `BranchFirst` in the words the app already uses for a Branch and its Department. */
export const branchFirst =
	(t: TFunction): BranchFirst =>
	(branch, department) =>
		t("organisation.accessRoles.assignments.department", {
			branch,
			department,
		});

/** The Department names that two or more of `choices` share. */
export const sharedDepartmentNames = (
	choices: ReadonlyArray<{ name: string }>
): Set<string> => {
	const seen = new Set<string>();
	const shared = new Set<string>();
	for (const { name } of choices) (seen.has(name) ? shared : seen).add(name);
	return shared;
};

/**
 * A Department's name as a picker shows it: with its Branch first where
 * another choice has the same name and the Branch is known; else the name.
 */
export const departmentLabel = (
	department: { name: string; branchName?: string | null },
	shared: ReadonlySet<string>,
	withBranch: BranchFirst
): string =>
	shared.has(department.name) && department.branchName
		? withBranch(department.branchName, department.name)
		: department.name;

/**
 * The line under a person's name: Department (named as `departmentLabel`
 * does against `shared`), job title and employee code, those known, joined
 * by " · "; none when nothing is known.
 */
export const personDescription = (
	person: PersonToApplyFor,
	shared: ReadonlySet<string> = new Set(),
	withBranch: BranchFirst = (_branch, department) => department
): string | undefined => {
	const department =
		person.departmentName &&
		departmentLabel(
			{ name: person.departmentName, branchName: person.branchName },
			shared,
			withBranch
		);
	const parts = [department, person.jobTitleName, person.employeeCode].filter(
		(part): part is string => Boolean(part)
	);
	return parts.length > 0 ? parts.join(" · ") : undefined;
};

/** The people with their Department's name and Branch from `departments` where their own list did not carry them. */
export const withDepartmentNames = <Person extends PersonToApplyFor>(
	people: ReadonlyArray<Person>,
	departments: ReadonlyArray<NamedDepartment>
): Array<Person> =>
	people.map((person) => {
		const known = departments.find(
			(department) => department.departmentId === person.departmentId
		);
		return {
			...person,
			departmentName: person.departmentName ?? known?.name ?? null,
			branchName: person.branchName ?? known?.branchName ?? null,
		};
	});

/** A person who may be offered: one with a name. */
type NamedPerson<Person extends PersonToApplyFor> = Person & {
	displayName: string;
};

/** The Department choice that narrows nothing. Department ids are UUIDs, so it never names one. */
export const ALL_DEPARTMENTS = "all";

/** A Department the picker may narrow to: one where someone offered is filed, with its Branch when known. */
export type DepartmentToChoose = {
	departmentId: string;
	name: string;
	branchName?: string;
};

/**
 * The Departments of `offered` (people already allowed), each once, by name;
 * a person filed nowhere, or at a Department with no name known, adds none.
 */
export const departmentChoices = (
	offered: ReadonlyArray<PersonToApplyFor>
): Array<DepartmentToChoose> => {
	const byId = new Map<string, DepartmentToChoose>();
	for (const { departmentId, departmentName, branchName } of offered)
		if (departmentId && departmentName)
			byId.set(departmentId, {
				departmentId,
				name: departmentName,
				branchName: branchName ?? undefined,
			});
	return [...byId.values()].sort((first, second) =>
		first.name.localeCompare(second.name)
	);
};

/** The choices, each with the label the picker shows (`departmentLabel`); none is dropped. */
export const labelledDepartmentChoices = (
	choices: ReadonlyArray<DepartmentToChoose>,
	withBranch: BranchFirst
): Array<DepartmentToChoose & { label: string }> => {
	const shared = sharedDepartmentNames(choices);
	return choices.map((choice) => ({
		...choice,
		label: departmentLabel(choice, shared, withBranch),
	}));
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
