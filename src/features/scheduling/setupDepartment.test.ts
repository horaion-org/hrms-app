import { describe, expect, it } from "vitest";
import { initialDepartmentOf } from "@/features/scheduling/setupDepartment";

const KITCHEN = { departmentId: "d-1" };
const BAR = { departmentId: "d-2" };

describe("initialDepartmentOf", () => {
	it("given_theFiltersDepartmentIsAChoice_when_opened_then_startsThere", () => {
		expect(initialDepartmentOf([KITCHEN, BAR], "d-2")).toBe("d-2");
	});

	it("given_noFilterOrOneNotOffered_when_oneChoice_then_startsAtIt", () => {
		expect(initialDepartmentOf([KITCHEN])).toBe("d-1");
		expect(initialDepartmentOf([KITCHEN], "d-3")).toBe("d-1");
	});

	it("given_noFilterOrOneNotOffered_when_severalOrNoChoices_then_startsEmpty", () => {
		expect(initialDepartmentOf([KITCHEN, BAR])).toBe("");
		expect(initialDepartmentOf([KITCHEN, BAR], "d-3")).toBe("");
		expect(initialDepartmentOf([], "d-1")).toBe("");
	});
});
