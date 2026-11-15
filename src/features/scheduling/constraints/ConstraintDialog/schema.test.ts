import { describe, expect, it } from "vitest";
import { valuesByField } from "@/features/scheduling/constraints/ConstraintDialog/schema";

describe("valuesByField", () => {
	it("groups a constraint's values by field, in their order", () => {
		expect(
			valuesByField([
				{ field: "SHIFT", value: "front-desk-am", name: "Front Desk AM" },
				{ field: "HEADCOUNT", value: "2", name: null },
				{ field: "SHIFT", value: "front-desk-pm", name: "Front Desk PM" },
			])
		).toEqual({ SHIFT: ["front-desk-am", "front-desk-pm"], HEADCOUNT: ["2"] });
	});

	it("leaves out a value the API says no longer fits", () => {
		expect(
			valuesByField([
				{ field: "JOB_TITLE", value: "clerk", name: "Clerk" },
				{
					field: "JOB_TITLE",
					value: "lead",
					name: "Lead",
					problem: "NOT_LISTED",
				},
			])
		).toEqual({ JOB_TITLE: ["clerk"] });
	});

	it("holds nothing for a constraint with no values", () => {
		expect(valuesByField([])).toEqual({});
	});
});
