import { describe, expect, it } from "vitest";
import { peopleToApplyFor, type PersonToApplyFor } from "./peopleToApplyFor";

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
