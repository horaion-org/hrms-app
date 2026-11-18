import { describe, expect, it } from "vitest";
import {
	peopleToApplyFor,
	personDescription,
	withDepartmentNames,
	type PersonToApplyFor,
} from "./peopleToApplyFor";

const ALEX = { membershipId: "m-1", displayName: "Alex Example" };
const BEA = { membershipId: "m-2", displayName: "Bea Kitchen" };
const REMOVED = { membershipId: "m-3", displayName: null };
const PEOPLE: ReadonlyArray<PersonToApplyFor> = [ALEX, BEA, REMOVED];

/** Allows everyone: only the name and the search decide. */
const anyone = (): boolean => true;

/** Allows Alex only, as a grant held at one Department would. */
const alexOnly = (person: PersonToApplyFor): boolean =>
	person.membershipId === ALEX.membershipId;

describe("peopleToApplyFor", () => {
	it.each([
		{
			name: "a blank search offers everyone allowed and named",
			search: "",
			maySetFor: anyone,
			expected: [ALEX, BEA],
		},
		{
			name: "spaces alone are a blank search",
			search: "   ",
			maySetFor: anyone,
			expected: [ALEX, BEA],
		},
		{
			name: "a search matches any part of the name, in any case",
			search: " kitch ",
			maySetFor: anyone,
			expected: [BEA],
		},
		{
			name: "someone the caller may not set for is never offered",
			search: "",
			maySetFor: alexOnly,
			expected: [ALEX],
		},
		{
			name: "a search matching only someone not allowed offers no one",
			search: "Bea",
			maySetFor: alexOnly,
			expected: [],
		},
		{
			name: "a removed member is never offered, even when allowed",
			search: "",
			maySetFor: (person: PersonToApplyFor): boolean => person === REMOVED,
			expected: [],
		},
	])("$name", ({ search, maySetFor, expected }) => {
		expect(peopleToApplyFor(PEOPLE, search, maySetFor)).toEqual(expected);
	});
});

describe("personDescription", () => {
	it.each([
		{
			name: "every part known",
			person: {
				...ALEX,
				departmentName: "Sales",
				jobTitleName: "Cashier",
				employeeCode: "EMP-1",
			},
			expected: "Sales · Cashier · EMP-1",
		},
		{
			name: "a missing part is left out, never blank",
			person: {
				...ALEX,
				departmentName: null,
				jobTitleName: "Cashier",
				employeeCode: "",
			},
			expected: "Cashier",
		},
		{ name: "nothing known", person: ALEX, expected: undefined },
	])("$name", ({ person, expected }) => {
		expect(personDescription(person)).toBe(expected);
	});
});

describe("withDepartmentNames", () => {
	const DEPARTMENTS = [{ departmentId: "d-1", name: "Sales" }];

	it.each([
		{
			name: "names a Department the page knows",
			person: { ...ALEX, departmentId: "d-1" },
			expected: "Sales",
		},
		{
			name: "keeps a name the list carried",
			person: { ...ALEX, departmentId: "d-1", departmentName: "Front" },
			expected: "Front",
		},
		{
			name: "leaves an unknown Department unnamed",
			person: { ...ALEX, departmentId: "d-9" },
			expected: null,
		},
		{ name: "a person filed nowhere", person: ALEX, expected: null },
	])("$name", ({ person, expected }) => {
		expect(
			withDepartmentNames<PersonToApplyFor>([person], DEPARTMENTS)[0]
				?.departmentName
		).toBe(expected);
	});
});
