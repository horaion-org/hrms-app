import type { TFunction } from "i18next";
import { LEAVE_REQUEST, type ApprovalInstance } from "@/features/approvals/api";
import type { ApprovalLine } from "@/features/approvals/approvalStanding";
import type { LeaveRequest } from "@/features/leave/api";

/*
 * A leave request under an approval flow (hrms-backend-v2 ADR-0067 §9):
 * the API's `approval` summary says which step it waits on, and the caller's
 * own waiting list (`/me/approval-instances/pending`) says whether that step
 * waits on them. Without a summary the request is decided in one step, as
 * before approval flows.
 */

/**
 * How a pending request is decided by the person deciding it now:
 * - `single`: no flow; one review approves or rejects it;
 * - `middle`: a step before the last; approving moves it to the next step;
 * - `last`: the last step; approving approves the leave, so the roster
 *   check and the comment on past leave apply, as for a single review.
 */
export type LeaveDecisionStage = "single" | "middle" | "last";

export const leaveDecisionStage = (
	request: Pick<LeaveRequest, "approval">
): LeaveDecisionStage => {
	const { approval } = request;
	if (!approval) return "single";
	return approval.currentStepOrder >= approval.stepCount ? "last" : "middle";
};

/** Whether approving now approves the leave itself: the roster check and the past-leave comment apply then. */
export const approvesLeave = (
	request: Pick<LeaveRequest, "approval">
): boolean => leaveDecisionStage(request) !== "middle";

/** The leave approvals waiting on the caller, by approval id, from their waiting list. */
export const leaveApprovalsWaitingOn = (
	waitingOnCaller: ReadonlyArray<ApprovalInstance> | undefined
): ReadonlySet<string> =>
	new Set(
		(waitingOnCaller ?? [])
			.filter((instance) => instance.subjectType === LEAVE_REQUEST)
			.map((instance) => instance.approvalInstanceId)
	);

/**
 * Where a pending request under a flow stands, as one line: "Waiting on you
 * · step 2 of 2 (HR)" when it is the caller's turn, else "Waiting for
 * approval · step 1 of 2 (Manager)". None without a flow, or once decided.
 */
export const leaveApprovalLine = (
	request: Pick<LeaveRequest, "status" | "approval">,
	callersTurn: boolean
): ApprovalLine | undefined => {
	const { approval } = request;
	if (request.status !== "PENDING" || !approval) return undefined;
	return {
		key: callersTurn ? "approvals.meta.waitingOnYou" : "approvals.meta.waiting",
		values: {
			step: approval.currentStepOrder,
			total: approval.stepCount,
			label: approval.currentStepLabel,
		},
	};
};

export type LeaveDecisionFacts = {
	ownMembershipId: string;
	/** The caller holds `leave_request:review` where the request's member is filed. */
	reviewsHere: boolean;
	waitingOnCaller: ReadonlySet<string>;
};

/**
 * Whether the caller may approve or reject the request now. Nobody decides
 * their own leave. Under a flow it is their turn only when the open step
 * waits on them; without one, the review key where the member is filed.
 */
export const canDecideLeave = (
	request: Pick<LeaveRequest, "membershipId" | "approval">,
	{ ownMembershipId, reviewsHere, waitingOnCaller }: LeaveDecisionFacts
): boolean => {
	if (request.membershipId === ownMembershipId) return false;
	return request.approval
		? waitingOnCaller.has(request.approval.approvalInstanceId)
		: reviewsHere;
};

/**
 * What the reviewer is told once they approved: a step before the last only
 * moves the request on, so it does not say the leave was approved.
 */
export const approvedMessage = (
	request: Pick<LeaveRequest, "approval" | "displayName">,
	t: TFunction
): string =>
	request.approval && leaveDecisionStage(request) === "middle"
		? t("leave.approval.stepApproved", {
				label: request.approval.currentStepLabel,
				name: request.displayName,
			})
		: t("leave.approved", { name: request.displayName });
