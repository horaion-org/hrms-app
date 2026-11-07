import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
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
import { isRosterClash } from "@/features/leave/leaveRefusal";
import type { ListPage } from "@/features/organisation/api";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
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

export type LeaveActions = {
	approve: UseMutationResult<
		LeaveRequest,
		Error,
		{
			request: LeaveRequest;
			comment: string;
			takeOffRosteredDays?: boolean;
		}
	>;
	reject: UseMutationResult<
		LeaveRequest,
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

/** Deciding and applying; each success reloads every list and window of the company's requests. */
export const useLeaveActions = (
	companyId: string,
	{ ownConfirmation = false }: { ownConfirmation?: boolean } = {}
): LeaveActions => {
	const client = useQueryClient();
	const reload = async (): Promise<void> => {
		await Promise.all([
			client.invalidateQueries({ queryKey: ["leave", companyId] }),
			client.invalidateQueries({ queryKey: ["notifications", companyId] }),
		]);
	};
	// A clash the screen did not know of means its rostered days are stale: read
	// them again, so the confirmation appears instead of the same refusal forever.
	const refreshRosteredDays = (error: Error): void => {
		if (isRosterClash(error))
			void client.invalidateQueries({ queryKey: rosteredDaysKey(companyId) });
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
				approveLeaveRequest(
					companyId,
					request.membershipId,
					request.leaveRequestId,
					comment,
					takeOffRosteredDays
				),
			onSuccess: reload,
			onError: refreshRosteredDays,
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
				rejectLeaveRequest(
					companyId,
					request.membershipId,
					request.leaveRequestId,
					reason
				),
			onSuccess: reload,
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
