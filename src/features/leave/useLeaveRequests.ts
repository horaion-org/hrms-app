import { useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import { myPendingApprovalsQuery } from "@/features/approvals/api";
import {
	leaveRequestsQuery,
	myLeaveRequestsQuery,
	pendingLeaveCountQuery,
	type LeaveQuery,
	type LeaveRequest,
} from "@/features/leave/api";
import {
	canDecideLeave,
	leaveApprovalsWaitingOn,
} from "@/features/leave/leaveApproval";
import type { ListPage } from "@/features/organisation/api";
import { useCurrentMembershipId } from "@/features/organisation/useCurrentCompanyId";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { recordScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/**
 * One page of leave requests. `hidden` when the person's grants don't reach
 * them anywhere, whether the workspace says so up front or the API refuses
 * with a 403. The API returns only the requests of people in units where
 * the key is held, so the rows are never trimmed here.
 */
export type LeaveList =
	| { status: "pending" | "error" | "hidden" }
	| ({ status: "ready" } & ListPage<LeaveRequest>);

/** `query` undefined, or `wanted` false, asks for nothing and stays pending. */
export const useLeaveRequests = (
	companyId: string,
	query: LeaveQuery | undefined,
	wanted = true
): LeaveList => {
	const access = useAccess();
	const allowed = access.canAny(LEAVE_READ_KEYS, "anywhere");
	const list = useQuery(
		leaveRequestsQuery(
			companyId,
			query ?? { page: 1, size: 1, sort: { field: "requestedAt", desc: true } },
			allowed && wanted && query !== undefined
		)
	);

	if (access.status !== "ready") return { status: access.status };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", ...list.data };
};

/**
 * One page of the caller's own requests; nothing is hidden, since any
 * active member may ask. It never consults the workspace, so it works with
 * no grants at all, or while the workspace is failing.
 */
export const useMyLeaveRequests = (
	companyId: string,
	query: LeaveQuery,
	wanted = true
): LeaveList => {
	const list = useQuery({
		...myLeaveRequestsQuery(companyId, query),
		enabled: wanted,
	});
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", ...list.data };
};

/**
 * How many requests wait for a decision, for the Team requests tab: only
 * for someone who may decide somewhere, and unknown (no badge) while it
 * loads or when it fails.
 */
export const usePendingLeaveCount = (companyId: string): number | undefined => {
	const access = useAccess();
	const reviews = access.canAnywhere("leave_request:review");
	return useQuery(pendingLeaveCountQuery(companyId, reviews)).data;
};

/** Who decides which request now: what the review list, the dashboard and the dialog offer Approve and Reject on. */
export type LeaveTurns = {
	/** The leave approvals whose open step waits on the caller. */
	waitingOnCaller: ReadonlySet<string>;
	/** Whether the caller may approve or reject the request now; see `canDecideLeave`. */
	canDecide: (request: LeaveRequest) => boolean;
	/** Whether the caller reads approvals (`approval:read`) where the request's member is filed. */
	readsApprovalSteps: (request: LeaveRequest) => boolean;
};

/**
 * The caller's turns on leave: their own waiting list of approvals, asked
 * only of someone who reviews leave somewhere (every approver of a leave
 * step does), and their review key per department for requests without a
 * flow.
 */
export const useLeaveTurns = (companyId: string): LeaveTurns => {
	const access = useAccess();
	const ownMembershipId = useCurrentMembershipId();
	const reviewsSomewhere = access.canAnywhere("leave_request:review");
	const waiting = useQuery(
		myPendingApprovalsQuery(companyId, reviewsSomewhere)
	);
	const waitingOnCaller = leaveApprovalsWaitingOn(waiting.data);
	return {
		waitingOnCaller,
		canDecide: (request) =>
			canDecideLeave(request, {
				ownMembershipId,
				reviewsHere: access.can(
					"leave_request:review",
					recordScope(request.departmentId)
				),
				waitingOnCaller,
			}),
		readsApprovalSteps: (request) =>
			access.can("approval:read", recordScope(request.departmentId)),
	};
};
