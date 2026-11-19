import { describe, expect, it } from "vitest";
import {
	ALL_DEPARTMENTS,
	departmentChoices,
	labelledDepartmentChoices,
	peopleToApplyFor,
	personDescription,
	sharedDepartmentNames,
	shownDepartment,
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

describe("peopleToApplyFor by Department", () => {
	const SALES_ALEX = { ...ALEX, departmentId: "d-1" };
	const KITCHEN_ALEX = {
		membershipId: "m-9",
		displayName: "Alex Example",
		departmentId: "d-2",
	};
	const UNFILED = { membershipId: "m-4", displayName: "Cy Unfiled" };
	const STAFF = [SALES_ALEX, KITCHEN_ALEX, UNFILED];

	it.each([
		{
			name: "every Department offers everyone",
			departmentId: ALL_DEPARTMENTS,
			expected: STAFF,
		},
		{
			name: "one Department offers its own only",
			departmentId: "d-2",
			expected: [KITCHEN_ALEX],
		},
		{
			name: "a Department with no one offers no one",
			departmentId: "d-9",
			expected: [],
		},
	])("$name", ({ departmentId, expected }) => {
		expect(peopleToApplyFor(STAFF, "", anyone, departmentId)).toEqual(expected);
	});

	it("never offers someone not allowed, whatever the Department", () => {
		expect(peopleToApplyFor(STAFF, "", alexOnly, "d-1")).toEqual([SALES_ALEX]);
		expect(peopleToApplyFor(STAFF, "", alexOnly, "d-2")).toEqual([]);
	});
});

describe("departmentChoices", () => {
	it.each([
		{
			name: "each Department once, by name",
			offered: [
				{ ...ALEX, departmentId: "d-2", departmentName: "Sales" },
				{ ...BEA, departmentId: "d-1", departmentName: "Kitchen" },
				{
					membershipId: "m-5",
					displayName: "Dee",
					departmentId: "d-2",
					departmentName: "Sales",
				},
			],
			expected: [
				{ departmentId: "d-1", name: "Kitchen" },
				{ departmentId: "d-2", name: "Sales" },
			],
		},
		{
			name: "someone filed nowhere or at an unnamed Department adds none",
			offered: [ALEX, { ...BEA, departmentId: "d-1", departmentName: null }],
			expected: [],
		},
		{ name: "no one offered, no choice", offered: [], expected: [] },
	])("$name", ({ offered, expected }) => {
		expect(departmentChoices(offered)).toEqual(expected);
	});
});

describe("shownDepartment", () => {
	const CHOICES = [
		{ departmentId: "d-1", name: "Kitchen" },
		{ departmentId: "d-2", name: "Sales" },
	];

	it.each([
		{ name: "a pick wins", picked: "d-1", page: "d-2", expected: "d-1" },
		{
			name: "a pick of every Department wins",
			picked: ALL_DEPARTMENTS,
			page: "d-2",
			expected: ALL_DEPARTMENTS,
		},
		{
			name: "before a pick, the page's Department among the choices",
			picked: undefined,
			page: "d-2",
			expected: "d-2",
		},
		{
			name: "the page's Department not among the choices: every one",
			picked: undefined,
			page: "d-9",
			expected: ALL_DEPARTMENTS,
		},
		{
			name: "no page Department: every one",
			picked: undefined,
			page: undefined,
			expected: ALL_DEPARTMENTS,
		},
	])("$name", ({ picked, page, expected }) => {
		expect(shownDepartment(picked, CHOICES, page)).toBe(expected);
	});
});

/** Names a Department with its Branch first, as the app's own words do. */
const withBranch = (branch: string, department: string): string =>
	`${branch} › ${department}`;

describe("labelledDepartmentChoices", () => {
	const ORCHARD_KITCHEN = {
		departmentId: "d-1",
		name: "Kitchen",
		branchName: "Orchard",
	};
	const TAMPINES_KITCHEN = {
		departmentId: "d-2",
		name: "Kitchen",
		branchName: "Tampines",
	};
	const SALES = { departmentId: "d-3", name: "Sales", branchName: "Orchard" };
	const UNKNOWN_BRANCH_KITCHEN = { departmentId: "d-4", name: "Kitchen" };

	it.each([
		{
			name: "unique names stay as they are",
			choices: [ORCHARD_KITCHEN, SALES],
			expected: ["Kitchen", "Sales"],
		},
		{
			name: "two Departments of one name both get their Branch first",
			choices: [ORCHARD_KITCHEN, TAMPINES_KITCHEN, SALES],
			expected: ["Orchard › Kitchen", "Tampines › Kitchen", "Sales"],
		},
		{
			name: "a shared name with no Branch known stays unprefixed and is kept",
			choices: [ORCHARD_KITCHEN, UNKNOWN_BRANCH_KITCHEN],
			expected: ["Orchard › Kitchen", "Kitchen"],
		},
	])("$name", ({ choices, expected }) => {
		expect(
			labelledDepartmentChoices(choices, withBranch).map(
				(choice) => choice.label
			)
		).toEqual(expected);
	});
});

describe("personDescription with shared Department names", () => {
	const shared = sharedDepartmentNames([
		{ name: "Kitchen" },
		{ name: "Kitchen" },
		{ name: "Sales" },
	]);

	it.each([
		{
			name: "a shared name gets the person's Branch first",
			person: { ...ALEX, departmentName: "Kitchen", branchName: "Tampines" },
			expected: "Tampines › Kitchen",
		},
		{
			name: "a unique name stays as it is",
			person: { ...ALEX, departmentName: "Sales", branchName: "Orchard" },
			expected: "Sales",
		},
		{
			name: "a shared name with no Branch known stays unprefixed",
			person: { ...ALEX, departmentName: "Kitchen" },
			expected: "Kitchen",
		},
	])("$name", ({ person, expected }) => {
		expect(personDescription(person, shared, withBranch)).toBe(expected);
	});
});
