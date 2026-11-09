import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	approvalKeys,
	decideApproval,
	myPendingApprovalsQuery,
} from "@/features/approvals/api";
import {
	approveLeaveRequest,
	cancelLeave,
	changeLeave,
	createLeaveRequest,
	createMyLeaveRequest,
	leaveRequestsQuery,
	myLeaveRequestsQuery,
	pendingLeaveCountQuery,
	recordLeave,
	rejectLeaveRequest,
	rosteredDaysKey,
	withdrawLeave,
	type ChangeLeaveBody,
	type RecordLeaveBody,
	type LeaveRequestBody,
	type LeaveQuery,
	type LeaveRequest,
} from "@/features/leave/api";
import {
	canDecideLeave,
	leaveApprovalsWaitingOn,
} from "@/features/leave/leaveApproval";
import { isRosterClash, isStaleDecision } from "@/features/leave/leaveRefusal";
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

/** A request under a flow is decided on its open step, which the decision names so a step that moved on is refused. */
const decideStep = (
	companyId: string,
	approval: NonNullable<LeaveRequest["approval"]>,
	decision: "APPROVE" | "REJECT",
	comment: string,
	takeOffRosteredDays?: boolean
): Promise<unknown> =>
	decideApproval(companyId, approval.approvalInstanceId, {
		stepOrder: approval.currentStepOrder,
		decision,
		comment: comment === "" ? null : comment,
		// Sent only when confirmed, as the single-step route does.
		...(takeOffRosteredDays ? { takeOffRosteredDays: true } : {}),
	});

export type LeaveActions = {
	/** Answers the request, or the approval, as the API answered it. */
	approve: UseMutationResult<
		unknown,
		Error,
		{
			request: LeaveRequest;
			comment: string;
			takeOffRosteredDays?: boolean;
		}
	>;
	reject: UseMutationResult<
		unknown,
		Error,
		{ request: LeaveRequest; reason: string }
	>;
	apply: UseMutationResult<
		LeaveRequest,
		Error,
		{ membershipId: string; body: LeaveRequestBody }
	>;
	/** The caller's own application. */
	applyOwn: UseMutationResult<LeaveRequest, Error, LeaveRequestBody>;
	/** A reviewer records approved leave on a member's behalf. */
	record: UseMutationResult<
		LeaveRequest,
		Error,
		{ membershipId: string; body: RecordLeaveBody }
	>;
	change: UseMutationResult<
		LeaveRequest,
		Error,
		{ request: LeaveRequest; body: ChangeLeaveBody }
	>;
	cancel: UseMutationResult<
		LeaveRequest,
		Error,
		{ request: LeaveRequest; remark: string }
	>;
	withdraw: UseMutationResult<LeaveRequest, Error, LeaveRequest>;
};

/**
 * Deciding and applying; each success reloads every list and window of the
 * company's requests, and the approvals. A request under a flow is approved
 * or rejected on its open step; one without is decided in one review.
 */
export const useLeaveActions = (
	companyId: string,
	{ ownConfirmation = false }: { ownConfirmation?: boolean } = {}
): LeaveActions => {
	const client = useQueryClient();
	const reload = async (): Promise<void> => {
		await Promise.all([
			client.invalidateQueries({ queryKey: ["leave", companyId] }),
			client.invalidateQueries({ queryKey: ["notifications", companyId] }),
			client.invalidateQueries({ queryKey: approvalKeys.all(companyId) }),
		]);
	};
	// A clash the screen did not know of means its rostered days are stale: read
	// them again, so the confirmation appears instead of the same refusal forever.
	const refreshRosteredDays = (error: Error): void => {
		if (isRosterClash(error))
			void client.invalidateQueries({ queryKey: rosteredDaysKey(companyId) });
	};
	// A request that moved on (a flow started, another approver decided) is read again, so the screen shows where it stands.
	const refreshDecided = (error: Error): void => {
		refreshRosteredDays(error);
		if (isStaleDecision(error)) void reload();
	};
	return {
		approve: useMutation({
			meta: { successMessage: ownConfirmation ? false : undefined },
			mutationFn: ({
				request,
				comment,
				takeOffRosteredDays,
			}: {
				request: LeaveRequest;
				comment: string;
				takeOffRosteredDays?: boolean;
			}) =>
				request.approval
					? decideStep(
							companyId,
							request.approval,
							"APPROVE",
							comment,
							takeOffRosteredDays
						)
					: approveLeaveRequest(
							companyId,
							request.membershipId,
							request.leaveRequestId,
							comment,
							takeOffRosteredDays
						),
			onSuccess: reload,
			onError: refreshDecided,
		}),
		reject: useMutation({
			meta: { successMessage: ownConfirmation ? false : undefined },
			mutationFn: ({
				request,
				reason,
			}: {
				request: LeaveRequest;
				reason: string;
			}) =>
				request.approval
					? decideStep(companyId, request.approval, "REJECT", reason)
					: rejectLeaveRequest(
							companyId,
							request.membershipId,
							request.leaveRequestId,
							reason
						),
			onSuccess: reload,
			onError: refreshDecided,
		}),
		apply: useMutation({
			mutationFn: ({
				membershipId,
				body,
			}: {
				membershipId: string;
				body: LeaveRequestBody;
			}) => createLeaveRequest(companyId, membershipId, body),
			onSuccess: reload,
		}),
		applyOwn: useMutation({
			mutationFn: (body: LeaveRequestBody) =>
				createMyLeaveRequest(companyId, body),
			onSuccess: reload,
		}),
		record: useMutation({
			mutationFn: ({
				membershipId,
				body,
			}: {
				membershipId: string;
				body: RecordLeaveBody;
			}) => recordLeave(companyId, membershipId, body),
			onSuccess: reload,
			onError: refreshRosteredDays,
		}),
		change: useMutation({
			mutationFn: ({
				request,
				body,
			}: {
				request: LeaveRequest;
				body: ChangeLeaveBody;
			}) => changeLeave(companyId, request, body),
			onSuccess: reload,
			onError: refreshRosteredDays,
		}),
		cancel: useMutation({
			mutationFn: ({
				request,
				remark,
			}: {
				request: LeaveRequest;
				remark: string;
			}) => cancelLeave(companyId, request, remark),
			onSuccess: reload,
		}),
		withdraw: useMutation({
			mutationFn: (request: LeaveRequest) =>
				withdrawLeave(companyId, request.leaveRequestId),
			onSuccess: reload,
		}),
	};
};
