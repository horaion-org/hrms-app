/** A person an area's list names; a removed member has no name and is never offered. */
export type PersonToApplyFor = {
	membershipId: string;
	displayName: string | null;
};

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
