import { describe, expect, it } from "vitest";
import { departmentsToApplyIn } from "@/features/leave/applyDepartments";

const SALES = { departmentId: "d-1", name: "Sales" };
const KITCHEN = { departmentId: "d-2", name: "Kitchen" };
const FRONT = { departmentId: "d-3", name: "Front desk" };

describe("departmentsToApplyIn", () => {
	it.each([
		{
			name: "every allowed Department, by name",
			allowed: ["d-1", "d-2", "d-3"],
			expected: [FRONT, KITCHEN, SALES],
		},
		{
			name: "a Department where the key is not held is never offered",
			allowed: ["d-1"],
			expected: [SALES],
		},
		{ name: "the key held nowhere: no choice", allowed: [], expected: [] },
	])("$name", ({ allowed, expected }) => {
		expect(
			departmentsToApplyIn([SALES, KITCHEN, FRONT, SALES], (departmentId) =>
				allowed.includes(departmentId)
			)
		).toEqual(expected);
	});
});
