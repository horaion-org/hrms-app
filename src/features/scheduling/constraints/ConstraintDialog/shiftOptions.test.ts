import { describe, expect, it } from "vitest";
import type { ConstraintOptions } from "@/features/scheduling/constraints/api";
import { shiftOptionsOf } from "@/features/scheduling/constraints/ConstraintDialog/shiftOptions";

/** A shift as the constraint options list it, in a group or in none. */
const shift = (
	shiftId: string,
	name: string,
	group: string | null
): ConstraintOptions["shifts"][number] => ({
	shiftId,
	name,
	group,
	jobTitleIds: [],
	listedIds: {},
});

describe("shiftOptionsOf", () => {
	it("offers each shift by id and name with its group, and no group for a shift without one", () => {
		expect(
			shiftOptionsOf([
				shift("lunch-rush", "Lunch Rush", "Service"),
				shift("overnight", "Overnight", null),
			])
		).toEqual([
			{ value: "lunch-rush", label: "Lunch Rush", group: "Service" },
			{ value: "overnight", label: "Overnight", group: undefined },
		]);
	});
});
