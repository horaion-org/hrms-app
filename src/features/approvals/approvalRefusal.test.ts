import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import {
	flowChangeRefusal,
	flowRefusal,
} from "@/features/approvals/approvalRefusal";
import { authTestI18n } from "@/features/auth/testingI18n";

const t = authTestI18n.t.bind(authTestI18n);
const noApprover = (body: unknown): ApiProblemError =>
	new ApiProblemError({
		message: "API says no",
		status: 400,
		errorCode: "APPROVAL_FLOW_HAS_NO_APPROVER",
		fieldErrors: [],
		reason: "validation",
		body,
	});

describe("a flow nobody can approve somewhere", () => {
	const body = {
		errorCode: "APPROVAL_FLOW_HAS_NO_APPROVER",
		departments: [
			{ departmentId: "d-1", departmentName: "Front Office", stepOrders: [2] },
			{ departmentId: "d-2", departmentName: "Guarding", stepOrders: [1, 2] },
		],
	};

	it("names each department and step on save, and how to fix it", () => {
		expect(flowRefusal(noApprover(body), t).message).toBe(
			"Nobody can approve step 2 in Front Office. Nobody can approve steps 1, 2 in Guarding. Give people “Decide approvals” there in Access roles, or change the step."
		);
	});

	it("names them when turning a flow on too", () => {
		expect(flowChangeRefusal(noApprover(body), t)).toMatch(
			/^Nobody can approve step 2 in Front Office\./
		);
	});

	it("falls back to the general sentence when the body names no department", () => {
		expect(flowRefusal(noApprover({}), t).message).toBe(
			"A step has nobody who can approve it. Name people who may decide it."
		);
	});
});
