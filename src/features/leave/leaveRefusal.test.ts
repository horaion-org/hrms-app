import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	applyRefusal,
	decisionRefusal,
	isRosterClash,
	isStaleDecision,
} from "@/features/leave/leaveRefusal";

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

describe("decisionRefusal", () => {
	it("puts a missing comment on approving past leave on the comment field", () => {
		expect(
			decisionRefusal(problem(400, "LEAVE_COMMENT_REQUIRED_FOR_PAST_DAYS"), t)
				.fields
		).toEqual({
			comment: "Enter a comment: this leave includes days before today.",
		});
	});
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

describe("isRosterClash", () => {
	it("recognises only the roster clash", () => {
		expect(isRosterClash(problem(409, "LEAVE_CLASHES_WITH_ROSTER"))).toBe(true);
		expect(isRosterClash(problem(409, "LEAVE_REQUEST_OVERLAPS"))).toBe(false);
		expect(isRosterClash(new Error("offline"))).toBe(false);
	});
});

describe("refusals under an approval flow", () => {
	it("says nobody can approve leave yet when applying starts a flow with an empty step", () => {
		expect(
			applyRefusal(problem(400, "APPROVAL_STEP_HAS_NO_APPROVER"), t).message
		).toBe(
			"Nobody can approve leave in this department yet. Ask an HR admin to check who approves leave."
		);
	});

	it("words the approvals route's refusals of a step's decision", () => {
		expect(
			decisionRefusal(problem(409, "APPROVAL_STEP_ALREADY_DECIDED"), t).message
		).toBe(
			"Someone else decided this step first. Reload the page to see where it stands."
		);
		expect(decisionRefusal(problem(403, "NOT_AN_APPROVER"), t).message).toBe(
			"You can’t decide this step."
		);
		expect(
			decisionRefusal(problem(403, "OWN_APPROVAL_DENIED"), t).message
		).toBe(
			"You can’t approve or reject your own leave. Another reviewer needs to decide it."
		);
		expect(
			decisionRefusal(problem(409, "LEAVE_APPROVAL_PENDING"), t).message
		).toBe(
			"This request now goes through approval steps. Reload the page to see where it stands."
		);
	});

	it("treats a request that moved on as one to read again", () => {
		expect(isStaleDecision(problem(409, "LEAVE_APPROVAL_PENDING"))).toBe(true);
		expect(isStaleDecision(problem(409, "APPROVAL_STEP_ALREADY_DECIDED"))).toBe(
			true
		);
		expect(isStaleDecision(problem(409, "APPROVAL_NOT_PENDING"))).toBe(true);
		expect(isStaleDecision(problem(409, "LEAVE_CLASHES_WITH_ROSTER"))).toBe(
			false
		);
	});
});
