import { describe, expect, it } from "vitest";
import {
	capacityProblemOf,
	type CapacityRule,
} from "@/features/scheduling/constraints/capacityProblems";

/** Two people hold Duty Manager (jt-dm) and one holds Shift Lead (jt-sl). */
const HOLDERS = new Map([
	["jt-dm", 2],
	["jt-sl", 1],
]);

/** A live staffing rule asking `comparison` `headcount` of `titles`, as the constraints list answers it. */
const rule = (
	headcount: string,
	comparison = "AT_LEAST",
	titles: Array<[string, string]> = [["jt-dm", "Duty Manager"]],
	status: CapacityRule["status"] = "ACTIVE"
): CapacityRule => ({
	status,
	values: [
		{ field: "HEADCOUNT", value: headcount, name: null, problem: null },
		{ field: "COMPARISON", value: comparison, name: null, problem: null },
		...titles.map(([value, name]) => ({
			field: "JOB_TITLE" as const,
			value,
			name,
			problem: null,
		})),
	],
});

describe("capacityProblemOf", () => {
	it("given_atLeastThreeWithTwoHolders_when_checked_then_itCanNeverBeMet", () => {
		expect(capacityProblemOf(rule("3"), HOLDERS)).toEqual({
			headcount: 3,
			peopleWithTitles: 2,
			jobTitleNames: ["Duty Manager"],
		});
	});

	// The owner's case: the rule was edited from 3 to 2; the live rule is what counts.
	it("given_theHeadcountEditedToTwo_when_checked_then_itIsNoLongerFlagged", () => {
		expect(capacityProblemOf(rule("2"), HOLDERS)).toBeUndefined();
	});

	it("given_exactlyMoreThanHold_when_checked_then_flagged_butAtMostNever", () => {
		expect(capacityProblemOf(rule("3", "EXACTLY"), HOLDERS)).toBeDefined();
		expect(capacityProblemOf(rule("9", "AT_MOST"), HOLDERS)).toBeUndefined();
	});

	it("given_severalTitles_when_checked_then_theirHoldersAreAddedUp", () => {
		const titles: Array<[string, string]> = [
			["jt-dm", "Duty Manager"],
			["jt-sl", "Shift Lead"],
		];

		expect(
			capacityProblemOf(rule("3", "AT_LEAST", titles), HOLDERS)
		).toBeUndefined();
		expect(capacityProblemOf(rule("4", "AT_LEAST", titles), HOLDERS)).toEqual({
			headcount: 4,
			peopleWithTitles: 3,
			jobTitleNames: ["Duty Manager", "Shift Lead"],
		});
	});

	it("given_anInactiveRuleOrATitleNotInTheRead_when_checked_then_notFlagged", () => {
		expect(
			capacityProblemOf(rule("3", "AT_LEAST", undefined, "INACTIVE"), HOLDERS)
		).toBeUndefined();
		expect(
			capacityProblemOf(rule("3", "AT_LEAST", [["jt-gone", "Porter"]]), HOLDERS)
		).toBeUndefined();
	});
});
