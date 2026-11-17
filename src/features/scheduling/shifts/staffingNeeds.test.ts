import { describe, expect, it } from "vitest";
import {
	staffingNeedsByShift,
	type NeedingConstraint,
} from "@/features/scheduling/shifts/staffingNeeds";

/** A constraint on shifts `shiftIds`, asking for `headcount` people as `titles`. */
const rule = (
	overrides: Partial<NeedingConstraint>,
	shiftIds: Array<string>,
	headcount: string,
	titles: Array<string>,
	comparison = "AT_LEAST"
): NeedingConstraint => ({
	constraintId: "c-1",
	name: "Cover",
	departmentId: "d-1",
	requirement: "MUST",
	status: "ACTIVE",
	values: [
		{ field: "COMPARISON", value: comparison, name: null },
		{ field: "HEADCOUNT", value: headcount, name: null },
		...titles.map((title) => ({
			field: "JOB_TITLE" as const,
			value: title.toLowerCase(),
			name: title,
		})),
		...shiftIds.map((id) => ({ field: "SHIFT" as const, value: id, name: id })),
	],
	...overrides,
});

describe("staffingNeedsByShift", () => {
	it("given_aRuleOnSeveralShifts_when_read_then_eachShiftNeedsItsHeadcountOfItsTitles", () => {
		const needs = staffingNeedsByShift([
			rule({}, ["night-1", "night-2"], "2", ["Operator", "Senior Operator"]),
		]);

		expect(needs.get("night-1")).toEqual([
			expect.objectContaining({
				comparison: "AT_LEAST",
				headcount: 2,
				jobTitleNames: ["Operator", "Senior Operator"],
				ifPossible: false,
			}),
		]);
		expect(needs.get("night-2")).toHaveLength(1);
	});

	it("given_twoRulesOnAShiftOneAnIfPossibleCap_when_read_then_saySo", () => {
		const needs = staffingNeedsByShift([
			rule({ constraintId: "c-1" }, ["day"], "1", ["Team Lead"]),
			rule(
				{ constraintId: "c-2", requirement: "SHOULD" },
				["day"],
				"1",
				["Operator"],
				"AT_MOST"
			),
		]);

		expect(needs.get("day")).toEqual([
			expect.objectContaining({ headcount: 1, ifPossible: false }),
			expect.objectContaining({ comparison: "AT_MOST", ifPossible: true }),
		]);
	});

	it("given_aSwitchedOffRuleOrOneWithoutShifts_when_read_then_neitherCounts", () => {
		const needs = staffingNeedsByShift([
			rule({ status: "INACTIVE" }, ["day"], "1", ["Operator"]),
			rule({ constraintId: "c-2" }, [], "1", ["Operator"]),
		]);

		expect(needs.size).toBe(0);
	});
});
