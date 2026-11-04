import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import { applyRefusal } from "@/features/leave/leaveRefusal";

const t = authTestI18n.t;
const problem = (
	status: number,
	errorCode?: string,
	fields: Array<string> = []
): ApiProblemError =>
	new ApiProblemError({
		message: "API says no",
		status,
		errorCode,
		fieldErrors: fields.map((field) => ({ field, message: "API says no" })),
		reason: "http",
	});

describe("applyRefusal", () => {
	it("puts a missing reason on the remarks field", () => {
		expect(applyRefusal(problem(400, "LEAVE_NOTES_REQUIRED"), t)).toEqual({
			fields: { notes: "Enter what this leave is for." },
			refreshMembers: false,
		});
	});

	it("puts a leave type no longer offered on the type field", () => {
		expect(applyRefusal(problem(400, "LEAVE_TYPE_NOT_AVAILABLE"), t)).toEqual({
			fields: { type: "This leave type is no longer offered. Choose another." },
			refreshMembers: false,
		});
	});

	it("puts a refused leaveType field on the type field", () => {
		expect(
			applyRefusal(problem(400, "VALIDATION_FAILED", ["leaveType"]), t).fields
		).toEqual({
			type: "This leave type is no longer offered. Choose another.",
		});
	});
});
