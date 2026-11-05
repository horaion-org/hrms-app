import { describe, expect, it } from "vitest";
import { chosenOutsideOffered } from "@/features/scheduling/ScheduleSetupStep/chosenDepartment";
import type { DepartmentChoice } from "@/features/workspace/unitChoices";

const kitchen: DepartmentChoice = {
	departmentId: "d-1",
	name: "Kitchen",
	branchId: "b-1",
	branchName: "Orchard",
	country: "SG",
	status: "ACTIVE",
};

describe("chosenOutsideOffered", () => {
	it("given_aChosenDepartmentStillOffered_when_checked_then_isInside", () => {
		expect(chosenOutsideOffered([kitchen], "d-1")).toBe(false);
	});

	it("given_aChosenDepartmentNoLongerOffered_when_checked_then_isOutside", () => {
		expect(chosenOutsideOffered([kitchen], "d-9")).toBe(true);
	});

	it("given_nothingChosenOrChoicesStillLoading_when_checked_then_isNotOutside", () => {
		expect(chosenOutsideOffered([kitchen], "")).toBe(false);
		expect(chosenOutsideOffered(undefined, "d-9")).toBe(false);
	});
});
