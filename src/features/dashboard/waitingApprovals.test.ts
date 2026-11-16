import { describe, expect, it } from "vitest";
import { waitingApprovalFixture } from "@/features/dashboard/fixtures";
import { approvalsNotListed } from "@/features/dashboard/waitingApprovals";

describe("approvalsNotListed", () => {
	it("leaves out a leave request already listed to decide, and keeps the rest", () => {
		const listed = waitingApprovalFixture({
			subjectType: "LEAVE_REQUEST",
			subjectId: "lr-1",
		});
		const otherLeave = waitingApprovalFixture({
			approvalInstanceId: "ai-2",
			subjectType: "LEAVE_REQUEST",
			subjectId: "lr-2",
		});
		const roster = waitingApprovalFixture({
			approvalInstanceId: "ai-3",
			subjectType: "SCHEDULE_PUBLICATION",
			subjectId: "lr-1",
		});

		expect(
			approvalsNotListed([listed, otherLeave, roster], new Set(["lr-1"]))
		).toEqual([otherLeave, roster]);
	});
});
