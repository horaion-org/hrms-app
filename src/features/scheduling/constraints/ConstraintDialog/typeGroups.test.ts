import { describe, expect, it } from "vitest";
import type { ConstraintTypeOption } from "@/features/scheduling/constraints/api";
import { typeGroupsOf } from "@/features/scheduling/constraints/ConstraintDialog/typeGroups";
import { CONSTRAINT_TYPE_OPTIONS } from "@/features/scheduling/constraints/fixtures";

/** A fixture kind, under the category and system flag a test gives it. */
const kind = (
	type: ConstraintTypeOption["type"],
	category: ConstraintTypeOption["category"],
	addedBySystem = false
): ConstraintTypeOption => ({
	...CONSTRAINT_TYPE_OPTIONS[0]!,
	type,
	category,
	addedBySystem,
});

/** The groups as category and kind names, for reading. */
const named = (
	groups: ReturnType<typeof typeGroupsOf>
): Array<[string, Array<string>]> =>
	groups.map((group) => [
		group.category,
		group.types.map((option) => option.type),
	]);

describe("typeGroupsOf", () => {
	it("given_kindsInTheApisOrder_when_grouped_then_categoriesAndKindsKeepThatOrder", () => {
		const types = [
			kind("REST_BETWEEN_SHIFTS", "WORKING_HOURS"),
			kind("SHIFT_STAFFING", "STAFFING"),
			kind("MAX_WORK_HOURS_PER_DAY", "WORKING_HOURS"),
		];

		expect(named(typeGroupsOf(types))).toEqual([
			["WORKING_HOURS", ["REST_BETWEEN_SHIFTS", "MAX_WORK_HOURS_PER_DAY"]],
			["STAFFING", ["SHIFT_STAFFING"]],
		]);
	});

	it("given_aKindTheSystemAdds_when_grouped_then_leftOutUnlessItIsTheOneShown", () => {
		const types = [
			kind("SHIFT_STAFFING", "STAFFING"),
			kind("DAY_TYPE_DAYS_PER_WEEK", "SHIFT_PATTERN", true),
		];

		expect(named(typeGroupsOf(types))).toEqual([
			["STAFFING", ["SHIFT_STAFFING"]],
		]);
		expect(named(typeGroupsOf(types, "DAY_TYPE_DAYS_PER_WEEK"))).toEqual([
			["STAFFING", ["SHIFT_STAFFING"]],
			["SHIFT_PATTERN", ["DAY_TYPE_DAYS_PER_WEEK"]],
		]);
	});

	it("given_noKinds_when_grouped_then_noGroups", () => {
		expect(typeGroupsOf([])).toEqual([]);
	});
});
