import { describe, expect, it } from "vitest";
import { departmentUnitOf } from "@/features/scheduling/departmentUnit";
import { schedulingWorkspace } from "@/features/scheduling/schedules/fixtures";

describe("departmentUnitOf", () => {
	const workspace = schedulingWorkspace(["schedule:read"]);

	it("given_aDepartmentOffered_when_asked_then_namesItWithItsBranch", () => {
		expect(
			departmentUnitOf(workspace, "c-1", ["schedule:read"], "d-1")
		).toEqual({ branchId: "b-1", departmentId: "d-1" });
	});

	it("given_aDepartmentWithoutTheKey_when_asked_then_namesNothing", () => {
		expect(
			departmentUnitOf(workspace, "c-1", ["schedule:create"], "d-1")
		).toBeUndefined();
		expect(
			departmentUnitOf(workspace, "c-9", ["schedule:read"], "d-1")
		).toBeUndefined();
	});

	it("given_anInactiveDepartment_when_onlyActiveOnesCount_then_namesNothing", () => {
		expect(
			departmentUnitOf(workspace, "c-1", ["schedule:read"], "d-3")
		).toEqual({ branchId: "b-1", departmentId: "d-3" });
		expect(
			departmentUnitOf(workspace, "c-1", ["schedule:read"], "d-3", {
				activeOnly: true,
			})
		).toBeUndefined();
	});
});
