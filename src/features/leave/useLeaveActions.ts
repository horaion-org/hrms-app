import {
	useMutation,
	useQueryClient,
	type QueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { approvalKeys, decideApproval } from "@/features/approvals/api";
import {
	approveLeaveRequest,
	cancelLeave,
	changeLeave,
	createLeaveRequest,
	createMyLeaveRequest,
	recordLeave,
	rejectLeaveRequest,
	rosteredDaysKey,
	withdrawLeave,
	type ChangeLeaveBody,
	type LeaveRequest,
	type LeaveRequestBody,
	type RecordLeaveBody,
} from "@/features/leave/api";
import { isRosterClash, isStaleDecision } from "@/features/leave/leaveRefusal";

/**
 * Reloads every list and window of the company's requests, the
 * notifications that point at them, and the approvals; what each leave
 * write does on success.
 */
export const reloadLeave = async (
	client: QueryClient,
	companyId: string
): Promise<void> => {
	await Promise.all([
		client.invalidateQueries({ queryKey: ["leave", companyId] }),
		client.invalidateQueries({ queryKey: ["notifications", companyId] }),
		client.invalidateQueries({ queryKey: approvalKeys.all(companyId) }),
	]);
};

/**
 * A clash the screen did not know of means its rostered days are stale: read
 * them again, so the confirmation appears instead of the same refusal forever.
 */
const refreshRosteredDaysOn = (
	client: QueryClient,
	companyId: string,
	error: Error
): void => {
	if (isRosterClash(error))
		void client.invalidateQueries({ queryKey: rosteredDaysKey(companyId) });
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

export type ApproveLeaveVariables = {
	request: LeaveRequest;
	comment: string;
	takeOffRosteredDays?: boolean;
};

export type RejectLeaveVariables = { request: LeaveRequest; reason: string };

export type LeaveDecisionActions = {
	/** Answers the request, or the approval, as the API answered it. */
	approve: UseMutationResult<unknown, Error, ApproveLeaveVariables>;
	reject: UseMutationResult<unknown, Error, RejectLeaveVariables>;
};

/**
 * Approving and rejecting. A request under a flow is decided on its open
 * step; one without is decided in one review. `ownConfirmation` silences the
 * app's success toast for a host that says so itself.
 */
export const useLeaveDecisionActions = (
	companyId: string,
	{ ownConfirmation = false }: { ownConfirmation?: boolean } = {}
): LeaveDecisionActions => {
	const client = useQueryClient();
	const reload = (): Promise<void> => reloadLeave(client, companyId);
	// A request that moved on (a flow started, another approver decided) is read again, so the screen shows where it stands.
	const refreshDecided = (error: Error): void => {
		refreshRosteredDaysOn(client, companyId, error);
		if (isStaleDecision(error)) void reload();
	};
	const meta = {
		successMessage: ownConfirmation ? (false as const) : undefined,
	};
	return {
		approve: useMutation({
			meta,
			mutationFn: ({
				request,
				comment,
				takeOffRosteredDays,
			}: ApproveLeaveVariables) =>
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
			meta,
			mutationFn: ({ request, reason }: RejectLeaveVariables) =>
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
	};
};

export type LeaveApplyActions = {
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
};

/** Applying on a member's behalf, for oneself, and recording approved leave. */
export const useLeaveApplyActions = (companyId: string): LeaveApplyActions => {
	const client = useQueryClient();
	const reload = (): Promise<void> => reloadLeave(client, companyId);
	return {
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
			onError: (error) => {
				refreshRosteredDaysOn(client, companyId, error);
			},
		}),
	};
};

export type LeaveLifecycleActions = {
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

/** Changing or cancelling approved leave, and withdrawing one's own pending request. */
export const useLeaveLifecycleActions = (
	companyId: string
): LeaveLifecycleActions => {
	const client = useQueryClient();
	const reload = (): Promise<void> => reloadLeave(client, companyId);
	return {
		change: useMutation({
			mutationFn: ({
				request,
				body,
			}: {
				request: LeaveRequest;
				body: ChangeLeaveBody;
			}) => changeLeave(companyId, request, body),
			onSuccess: reload,
			onError: (error) => {
				refreshRosteredDaysOn(client, companyId, error);
			},
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
