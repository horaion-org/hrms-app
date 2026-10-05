import { describe, expect, it } from "vitest";
import { ApiProblemError, UnreachableError } from "@/common/problem";
import { mapRefusal, type RefusalRules } from "@/features/organisation/refusal";

const problem = (
	status: number,
	errorCode: string,
	fieldErrors: Array<{ field: string; message: string }> = []
): ApiProblemError =>
	new ApiProblemError({
		status,
		errorCode,
		fieldErrors,
		reason: "http",
		message: "Private server wording",
	});

const rules: RefusalRules<"name" | "heads"> = {
	codes: {
		"409 NAME_CONFLICT": { field: "name", message: "Taken" },
		"400 STALE_HEAD": {
			field: "heads",
			message: "Stale",
			refreshMembers: true,
		},
	},
	alerts: { "400 BAD_KEYS": "Bad keys" },
	fieldErrors: {
		name: { field: "name", message: "Check name" },
		initialHeadCompanyMembershipIds: { field: "heads", message: "Check heads" },
	},
	forbidden: "Forbidden",
	failed: "Failed",
};

describe("mapRefusal", () => {
	it("places a known code on its field only when status and code both match", () => {
		expect(mapRefusal(problem(409, "NAME_CONFLICT"), rules)).toEqual({
			fields: { name: "Taken" },
			refreshMembers: false,
		});
		expect(mapRefusal(problem(500, "NAME_CONFLICT"), rules)).toEqual({
			fields: {},
			message: "Failed",
			refreshMembers: false,
		});
	});
	it("asks for fresh people when the code says they are stale", () => {
		expect(mapRefusal(problem(400, "STALE_HEAD"), rules).refreshMembers).toBe(
			true
		);
	});
	it("shows a known alert code at form level", () => {
		expect(mapRefusal(problem(400, "BAD_KEYS"), rules).message).toBe(
			"Bad keys"
		);
	});
	it("maps only recognised field errors and never copies server prose", () => {
		const result = mapRefusal(
			problem(400, "VALIDATION_FAILED", [
				{ field: "name", message: "Secret" },
				{ field: "initialHeadCompanyMembershipIds", message: "Secret" },
				{ field: "unknown", message: "Secret" },
			]),
			rules
		);
		expect(result.fields).toEqual({ name: "Check name", heads: "Check heads" });
		expect(JSON.stringify(result)).not.toContain("Secret");
	});
	it.each([
		[problem(403, "AUTHORIZATION_DENIED"), "Forbidden"],
		[
			problem(400, "VALIDATION_FAILED", [{ field: "other", message: "x" }]),
			"Failed",
		],
		[new UnreachableError(), "Failed"],
	])("falls back to a form alert: %s", (error, message) => {
		expect(mapRefusal(error, rules)).toEqual({
			fields: {},
			message,
			refreshMembers: false,
		});
	});
});
