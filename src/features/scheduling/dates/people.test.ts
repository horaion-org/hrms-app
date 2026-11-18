import { describe, expect, it } from "vitest";
import {
	datesPlanFixture,
	datesPlanRedoingFixture,
	PLAN_PEOPLE,
} from "@/features/scheduling/dates/fixtures";
import {
	chosenAmongPlan,
	memberProfileIdsToSend,
	peopleProblemOf,
	peopleSummaryOf,
} from "@/features/scheduling/dates/people";

const FREE_WEEKS = datesPlanFixture().weeks;
const REDOING_WEEKS = datesPlanRedoingFixture().weeks;

describe("memberProfileIdsToSend", () => {
	it.each([
		{ case: "nothing chosen is everyone", chosen: undefined, sent: undefined },
		{
			case: "every listed person ticked is everyone",
			chosen: ["m-3", "m-1", "m-2"],
			sent: undefined,
		},
		{
			case: "two of three are sent in the plan's order",
			chosen: ["m-3", "m-1"],
			sent: ["m-1", "m-3"],
		},
		{
			case: "an id the plan no longer lists is left out",
			chosen: ["m-1", "m-9"],
			sent: ["m-1"],
		},
		{ case: "nobody ticked sends none", chosen: [], sent: [] },
	])("$case", ({ chosen, sent }) => {
		expect(memberProfileIdsToSend(chosen, PLAN_PEOPLE)).toEqual(sent);
	});
});

describe("peopleSummaryOf", () => {
	it.each([
		{
			case: "everyone",
			chosen: undefined,
			summary: { everyone: true, chosen: 3, total: 3 },
		},
		{
			case: "two of three",
			chosen: ["m-1", "m-2"],
			summary: { everyone: false, chosen: 2, total: 3 },
		},
	])("$case", ({ chosen, summary }) => {
		expect(peopleSummaryOf(chosen, PLAN_PEOPLE)).toEqual(summary);
	});
});

describe("chosenAmongPlan", () => {
	it.each([
		{ case: "everyone stays everyone", chosen: undefined, kept: undefined },
		{
			case: "a person the plan no longer lists is dropped",
			chosen: ["m-2", "m-9"],
			kept: ["m-2"],
		},
	])("$case", ({ chosen, kept }) => {
		expect(chosenAmongPlan(chosen, PLAN_PEOPLE)).toEqual(kept);
	});
});

describe("peopleProblemOf", () => {
	it.each([
		{
			case: "everyone over free days",
			chosen: undefined,
			weeks: FREE_WEEKS,
			problem: undefined,
		},
		{
			case: "everyone over scheduled days",
			chosen: undefined,
			weeks: REDOING_WEEKS,
			problem: undefined,
		},
		{
			case: "nobody chosen",
			chosen: [],
			weeks: FREE_WEEKS,
			problem: "nobodyChosen",
		},
		{
			case: "people chosen over free days",
			chosen: ["m-1"],
			weeks: FREE_WEEKS,
			problem: undefined,
		},
		{
			case: "people chosen over scheduled days",
			chosen: ["m-1"],
			weeks: REDOING_WEEKS,
			problem: "daysTaken",
		},
	])("$case", ({ chosen, weeks, problem }) => {
		expect(peopleProblemOf(chosen, PLAN_PEOPLE, weeks)).toBe(problem);
	});
});
