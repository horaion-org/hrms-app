import { describe, expect, it } from "vitest";
import { approvalInstanceFixture } from "@/features/approvals/fixtures";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	approvedMessage,
	approvesLeave,
	canDecideLeave,
	leaveApprovalLine,
	leaveApprovalsWaitingOn,
	leaveDecisionStage,
} from "@/features/leave/leaveApproval";
import { leaveAtStepFixture, leaveFixture } from "@/features/leave/fixtures";

const t = authTestI18n.t.bind(authTestI18n);
const single = leaveFixture({ leaveRequestId: "leave-aisha" });
const atManager = leaveAtStepFixture(1);
const atHr = leaveAtStepFixture(2);

describe("leaveDecisionStage", () => {
	it("tells a single review from a step before the last and the last step", () => {
		expect(leaveDecisionStage(single)).toBe("single");
		expect(leaveDecisionStage(atManager)).toBe("middle");
		expect(leaveDecisionStage(atHr)).toBe("last");
	});

	it("approves the leave itself only in a single review or at the last step", () => {
		expect(approvesLeave(single)).toBe(true);
		expect(approvesLeave(atManager)).toBe(false);
		expect(approvesLeave(atHr)).toBe(true);
	});
});

describe("leaveApprovalsWaitingOn", () => {
	it("keeps the leave approvals of the caller's waiting list, by id", () => {
		const waiting = leaveApprovalsWaitingOn([
			approvalInstanceFixture(),
			approvalInstanceFixture({
				approvalInstanceId: "ai-leave",
				subjectType: "LEAVE_REQUEST",
			}),
		]);
		expect([...waiting]).toEqual(["ai-leave"]);
		expect(leaveApprovalsWaitingOn(undefined).size).toBe(0);
	});
});

describe("leaveApprovalLine", () => {
	it("says which step a pending request waits on, and when it is the caller's turn", () => {
		expect(leaveApprovalLine(atManager, false)).toEqual({
			key: "approvals.meta.waiting",
			values: { step: 1, total: 2, label: "Manager" },
		});
		expect(leaveApprovalLine(atHr, true)?.key).toBe(
			"approvals.meta.waitingOnYou"
		);
	});

	it("says nothing without a flow, or once the request is decided", () => {
		expect(leaveApprovalLine(single, true)).toBeUndefined();
		expect(
			leaveApprovalLine({ ...atManager, status: "APPROVED" }, true)
		).toBeUndefined();
	});
});

describe("canDecideLeave", () => {
	const facts = {
		ownMembershipId: "m-owner",
		reviewsHere: true,
		waitingOnCaller: new Set<string>(),
	};

	it("goes by the review key without a flow, and never for one's own leave", () => {
		expect(canDecideLeave(single, facts)).toBe(true);
		expect(canDecideLeave(single, { ...facts, reviewsHere: false })).toBe(
			false
		);
		expect(
			canDecideLeave(single, { ...facts, ownMembershipId: "m-aisha" })
		).toBe(false);
	});

	it("goes by whose turn it is under a flow, whatever the review key", () => {
		expect(canDecideLeave(atManager, facts)).toBe(false);
		expect(
			canDecideLeave(atManager, {
				...facts,
				reviewsHere: false,
				waitingOnCaller: new Set(["ai-leave"]),
			})
		).toBe(true);
	});
});

describe("approvedMessage", () => {
	it("says a step was approved before the last, and the leave at the last", () => {
		expect(approvedMessage(atManager, t)).toBe(
			"You approved Manager for Aisha Rahman. The next step is asked now."
		);
		expect(approvedMessage(atHr, t)).toBe("Request for Aisha Rahman approved.");
		expect(approvedMessage(single, t)).toBe(
			"Request for Aisha Rahman approved."
		);
	});
});
