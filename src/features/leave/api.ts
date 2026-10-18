import {
	keepPreviousData,
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import {
	companyPath,
	fetchList,
	type ListPage,
} from "@/features/organisation/api";
import {
	accessiblePreviousData,
	administrativeMeta,
	selfMeta,
} from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

const leaveTypeSchema = z.enum([
	"ANNUAL",
	"SICK",
	"HOSPITALISATION",
	"COMPASSIONATE",
	"MATERNITY",
	"UNPAID",
	"MARRIAGE",
]);

/** The kinds of leave the API knows, a fixed list until leave schemes arrive. */
export type LeaveType = z.infer<typeof leaveTypeSchema>;

export const LEAVE_TYPES = leaveTypeSchema.options;

export const isLeaveType = (value: string): value is LeaveType =>
	leaveTypeSchema.safeParse(value).success;

const leaveStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

/** Where a request stands; a decision is final. */
export type LeaveStatus = z.infer<typeof leaveStatusSchema>;

export const LEAVE_STATUSES = leaveStatusSchema.options;

export const isLeaveStatus = (value: string): value is LeaveStatus =>
	leaveStatusSchema.safeParse(value).success;

const participantSchema = z.object({
	membershipId: z.string(),
	displayName: z.string(),
});

export const leaveRequestSchema = z.object({
	leaveRequestId: z.string(),
	membershipId: z.string(),
	employeeCode: z.string(),
	displayName: z.string(),
	/** The member's current Branch and Department; null for a member without one. */
	branchId: z.string().nullable(),
	branchName: z.string().nullable(),
	branchCountry: z.string().nullable(),
	departmentId: z.string().nullable(),
	departmentName: z.string().nullable(),
	leaveType: leaveTypeSchema,
	startDate: z.iso.date(),
	endDate: z.iso.date(),
	/** Monday-to-Friday days in the period, as the API counts them. */
	workingDays: z.number().int().nonnegative(),
	status: leaveStatusSchema,
	requestedAt: z.iso.datetime({ offset: true }),
	requestedBy: participantSchema,
	reviewedAt: z.iso.datetime({ offset: true }).nullable(),
	reviewedBy: participantSchema.nullable(),
	/** Present exactly when rejected. */
	rejectionReason: z.string().nullable(),
});

/** One leave request as the list, the timeline and the dialog show it. */
export type LeaveRequest = z.infer<typeof leaveRequestSchema>;

/** The fields the API sorts requests by. */
export const LEAVE_SORT_FIELDS = [
	"displayName",
	"startDate",
	"requestedAt",
	"leaveType",
	"status",
] as const;

export type LeaveSortField = (typeof LEAVE_SORT_FIELDS)[number];

export const isLeaveSortField = (value: string): value is LeaveSortField =>
	(LEAVE_SORT_FIELDS as ReadonlyArray<string>).includes(value);

export type LeaveSort = { field: LeaveSortField; desc: boolean };

export const LEAVE_PAGE_SIZE = 10;

/** The most rows one timeline window asks for, the API's largest page. */
export const TIMELINE_PAGE_SIZE = 200;

/** One page of requests: `page` counts from 1, as people do. */
export type LeaveQuery = {
	page: number;
	size: number;
	sort: LeaveSort;
	status?: LeaveStatus;
	/** The Branch of the member's Department. */
	branchId?: string;
	/** Keeps requests sharing a day with the `from`–`to` window; either alone is open-ended. */
	from?: string;
	to?: string;
};

export const leaveRequestsPath = (
	companyId: string,
	{ page, size, sort, status, branchId, from, to }: LeaveQuery
): string => {
	const query = new URLSearchParams({
		// The API counts pages from 0.
		page: String(page - 1),
		size: String(size),
		sort: `${sort.field},${sort.desc ? "desc" : "asc"}`,
	});
	if (status) query.set("status", status);
	if (branchId) query.set("branchId", branchId);
	if (from) query.set("from", from);
	if (to) query.set("to", to);
	return `${companyPath(companyId)}/leave-requests?${query.toString()}`;
};

export const fetchLeaveRequests = (
	companyId: string,
	query: LeaveQuery,
	signal?: AbortSignal
): Promise<ListPage<LeaveRequest>> =>
	fetchList(leaveRequestsPath(companyId, query), leaveRequestSchema, signal);

/**
 * One page of the company's leave requests inside the person's grants; each
 * page, sort, filter and window is its own entry. `allowed` false asks for
 * nothing, for a person the workspace does not grant the list.
 */
export const leaveRequestsQuery = (
	companyId: string,
	query: LeaveQuery,
	allowed = true
): UndefinedInitialDataOptions<
	ListPage<LeaveRequest>,
	Error,
	ListPage<LeaveRequest>,
	readonly ["leave", string, LeaveQuery]
> =>
	queryOptions({
		queryKey: ["leave", companyId, query] as const,
		queryFn: allowed
			? ({ signal }): Promise<ListPage<LeaveRequest>> =>
					fetchLeaveRequests(companyId, query, signal)
			: skipToken,
		// Keep the current rows on screen while another page, filter or window loads, unless withdrawn.
		placeholderData: accessiblePreviousData(),
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** The caller's own requests: the same page shape, keyed on their membership by the API. */
export const myLeaveRequestsPath = (
	companyId: string,
	query: LeaveQuery
): string =>
	leaveRequestsPath(companyId, query).replace(
		`${companyPath(companyId)}/leave-requests?`,
		`${companyPath(companyId)}/me/leave-requests?`
	);

export const fetchMyLeaveRequests = (
	companyId: string,
	query: LeaveQuery,
	signal?: AbortSignal
): Promise<ListPage<LeaveRequest>> =>
	fetchList(myLeaveRequestsPath(companyId, query), leaveRequestSchema, signal);

/** One page of the caller's own leave requests; any active member may ask. */
export const myLeaveRequestsQuery = (
	companyId: string,
	query: LeaveQuery
): UndefinedInitialDataOptions<
	ListPage<LeaveRequest>,
	Error,
	ListPage<LeaveRequest>,
	readonly ["leave", string, "me", LeaveQuery]
> =>
	queryOptions({
		queryKey: ["leave", companyId, "me", query] as const,
		queryFn: ({ signal }): Promise<ListPage<LeaveRequest>> =>
			fetchMyLeaveRequests(companyId, query, signal),
		placeholderData: keepPreviousData,
		// Own records: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** What applying for leave sends: inclusive ISO dates. */
export type LeaveRequestBody = {
	leaveType: LeaveType;
	startDate: string;
	endDate: string;
};

const memberLeavePath = (companyId: string, membershipId: string): string =>
	`${companyPath(companyId)}/member-profiles/${encodeURIComponent(membershipId)}/leave-requests`;

/** A deep link reads one guarded record, independent of list filters and pagination. */
export const leaveRequestQuery = (
	companyId: string,
	ownMembershipId: string,
	requestId: string,
	memberId?: string
): UndefinedInitialDataOptions<
	LeaveRequest,
	Error,
	LeaveRequest,
	readonly ["leave", string, "detail", string, string, string]
> =>
	queryOptions({
		queryKey: [
			"leave",
			companyId,
			"detail",
			ownMembershipId,
			memberId ?? "me",
			requestId,
		] as const,
		queryFn: ({ signal }) =>
			apiRequest(
				`${memberId ? memberLeavePath(companyId, memberId) : `${companyPath(companyId)}/me/leave-requests`}/${encodeURIComponent(requestId)}`,
				leaveRequestSchema,
				{ signal, responseFormat: "record" }
			),
		meta: memberId
			? administrativeMeta(companyId, { record: true })
			: selfMeta(companyId),
		retry,
	});

/** Applies for leave on a member's behalf; the applicant is the caller. */
export const createLeaveRequest = (
	companyId: string,
	membershipId: string,
	body: LeaveRequestBody
): Promise<LeaveRequest> =>
	apiRequest(memberLeavePath(companyId, membershipId), leaveRequestSchema, {
		method: "POST",
		body,
	});

/** Applies for the caller's own leave; the member and the applicant are both the caller. */
export const createMyLeaveRequest = (
	companyId: string,
	body: LeaveRequestBody
): Promise<LeaveRequest> =>
	apiRequest(
		`${companyPath(companyId)}/me/leave-requests`,
		leaveRequestSchema,
		{
			method: "POST",
			body,
		}
	);

/** Grants a pending request; the reviewer is the caller. */
export const approveLeaveRequest = (
	companyId: string,
	membershipId: string,
	leaveRequestId: string
): Promise<LeaveRequest> =>
	apiRequest(
		`${memberLeavePath(companyId, membershipId)}/${encodeURIComponent(leaveRequestId)}/approval`,
		leaveRequestSchema,
		{ method: "POST" }
	);

/** Refuses a pending request with a reason for the member. */
export const rejectLeaveRequest = (
	companyId: string,
	membershipId: string,
	leaveRequestId: string,
	reason: string
): Promise<LeaveRequest> =>
	apiRequest(
		`${memberLeavePath(companyId, membershipId)}/${encodeURIComponent(leaveRequestId)}/rejection`,
		leaveRequestSchema,
		{ method: "POST", body: { reason: reason.trim() } }
	);
