import type { LeaveList } from "@/features/leave/useLeaveRequests";

/** The copy a Leave list that is not ready is explained with, and whether it is an alert. */
export type LeaveListProblem = {
	key: "leave.hidden" | "leave.failed" | "leave.myFailed";
	alert: boolean;
};

/**
 * What a list that is not ready says, if anything: a hidden list quietly,
 * a failed one as an alert, worded for the caller's own list when `own`.
 */
export const leaveListProblemOf = (
	list: LeaveList,
	own: boolean
): LeaveListProblem | undefined => {
	if (list.status === "hidden") return { key: "leave.hidden", alert: false };
	if (list.status === "error")
		return { key: own ? "leave.myFailed" : "leave.failed", alert: true };
	return undefined;
};
