import { describe, expect, it } from "vitest";
import { parseRosterSearch } from "@/features/scheduling/roster/rosterSearch";

describe("parseRosterSearch", () => {
	it("reads the schedule's branch and department, dropping anything else", () => {
		expect(
			parseRosterSearch({ branchId: "b-1", departmentId: "d-1", step: "setup" })
		).toEqual({ branchId: "b-1", departmentId: "d-1" });
	});

	it.each([
		["no ids", {}],
		["no branch", { departmentId: "d-1" }],
		["no department", { branchId: "b-1" }],
		["a blank branch", { branchId: " ", departmentId: "d-1" }],
		["a department that is not text", { branchId: "b-1", departmentId: 7 }],
	])("refuses %s", (_, search) => {
		expect(() => parseRosterSearch(search)).toThrow();
	});
});
