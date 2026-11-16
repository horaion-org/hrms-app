import { describe, expect, it } from "vitest";
import {
	capacityKeyOf,
	capacityProblemsOf,
	type StaffingRuleFacts,
} from "@/features/scheduling/constraints/capacityProblems";

/** A staffing rule of department d-1 asking for `headcount` where `peopleWithTitles` hold its titles. */
const rule = (
	ruleName: string,
	headcount: number,
	peopleWithTitles: number
): StaffingRuleFacts => ({
	departmentId: "d-1",
	ruleName,
	headcount,
	jobTitles: [{ name: "Duty Manager" }],
	peopleWithTitles,
});

describe("capacityProblemsOf", () => {
	it("given_aRuleAskingForMoreThanHoldItsTitles_when_read_then_itIsAProblemKeyedByDepartmentAndName", () => {
		const problems = capacityProblemsOf([
			rule("Duty cover", 3, 2),
			rule("Night cover", 2, 6),
			rule("Exact", 2, 2),
		]);

		expect([...problems.keys()]).toEqual([capacityKeyOf("d-1", "Duty cover")]);
		expect(problems.get(capacityKeyOf("d-1", "Duty cover"))).toEqual({
			headcount: 3,
			peopleWithTitles: 2,
			jobTitleNames: ["Duty Manager"],
		});
	});
});
