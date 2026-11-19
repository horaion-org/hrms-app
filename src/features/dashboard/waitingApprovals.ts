import type { WaitingApproval } from "@/features/dashboard/api";

/** The approval subject a leave request waits as. */
const LEAVE_SUBJECT = "LEAVE_REQUEST";

/**
 * The waiting approvals Home has not already listed: a leave request shown
 * under "Leave to decide" is left out here, so nothing is said twice.
 */
export const approvalsNotListed = (
	approvals: ReadonlyArray<WaitingApproval>,
	listedLeaveIds: ReadonlySet<string>
): Array<WaitingApproval> =>
	approvals.filter(
		(approval) =>
			approval.subjectType !== LEAVE_SUBJECT ||
			!listedLeaveIds.has(approval.subjectId)
	);
