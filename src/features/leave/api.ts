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

/**
 * One leave type of the company's catalogue. `grantKind` is read as any
 * string so a kind added later (EARNED) cannot fail the catalogue; the app
 * groups only the kinds it knows. A `system` type (the scheduler's day off)
 * is never applied for.
 */
export const companyLeaveTypeSchema = z.object({
	leaveTypeId: z.string(),
	code: z.string(),
	name: z.string(),
	grantKind: z.string(),
	paid: z.boolean(),
	requiresReason: z.boolean(),
	status: z.enum(["ACTIVE", "INACTIVE"]),
	displayOrder: z.number().int(),
	system: z.boolean(),
});

/** One leave type a company offers, as its catalogue lists it. */
export type CompanyLeaveType = z.infer<typeof companyLeaveTypeSchema>;

/** The company's active leave types, in the API's order: kind, then the company's order. */
export const fetchActiveLeaveTypes = (
	companyId: string,
	signal?: AbortSignal
): Promise<Array<CompanyLeaveType>> =>
	apiRequest(
		`${companyPath(companyId)}/me/leave-types?${new URLSearchParams({ status: "ACTIVE" }).toString()}`,
		z.array(companyLeaveTypeSchema),
		{ signal }
	);

/**
 * The company's active leave types, for applying. Any active member may read
 * the catalogue, so it is the caller's own context, never withdrawn with
 * administrative grants. It changes rarely, so it stays fresh for minutes.
 * `allowed` false asks for nothing, until someone opens an application.
 */
export const activeLeaveTypesQuery = (
	companyId: string,
	allowed = true
): UndefinedInitialDataOptions<
	Array<CompanyLeaveType>,
	Error,
	Array<CompanyLeaveType>,
	readonly ["leave-types", string, "ACTIVE"]
> =>
	queryOptions({
		queryKey: ["leave-types", companyId, "ACTIVE"] as const,
		queryFn: allowed
			? ({ signal }): Promise<Array<CompanyLeaveType>> =>
					fetchActiveLeaveTypes(companyId, signal)
			: skipToken,
		meta: selfMeta(companyId),
		staleTime: 5 * 60_000,
		retry,
	});

const leaveStatusSchema = z.enum([
	"PENDING",
	"APPROVED",
	"REJECTED",
	"CANCELLED",
]);

/** Where a request stands; members withdraw pending ones, reviewers change or cancel approved ones. */
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
	/**
	 * The leave type's code. Any string: a company names its own types, and a
	 * code this app has never seen must not fail the whole page.
	 */
	leaveType: z.string(),
	/** The company's leave type. Absent from an API older than the leave type catalogue. */
	leaveTypeId: z.string().nullable().default(null),
	/** What the company calls the leave type. Absent from an API older than the leave type catalogue. */
	leaveTypeName: z.string().nullable().default(null),
	startDate: z.iso.date(),
	endDate: z.iso.date(),
	/** The days of the period that use leave, as the API counts them from rosters. */
	workingDays: z.number().int().nonnegative(),
	/** The applicant's remarks for the reviewer; null when none. Absent from an API older than remarks. */
	notes: z.string().nullable().default(null),
	status: leaveStatusSchema,
	requestedAt: z.iso.datetime({ offset: true }),
	requestedBy: participantSchema,
	reviewedAt: z.iso.datetime({ offset: true }).nullable(),
	reviewedBy: participantSchema.nullable(),
	/** Present exactly when rejected. */
	rejectionReason: z.string().nullable(),
	/** The reviewer's words when approving, if any. Absent from an API older than approval comments. */
	approvalComment: z.string().nullable().default(null),
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
	/** The member's Department. */
	departmentId?: string;
	/** Keeps requests sharing a day with the `from`–`to` window; either alone is open-ended. */
	from?: string;
	to?: string;
};

export const leaveRequestsPath = (
	companyId: string,
	{ page, size, sort, status, branchId, departmentId, from, to }: LeaveQuery
): string => {
	const query = new URLSearchParams({
		// The API counts pages from 0.
		page: String(page - 1),
		size: String(size),
		sort: `${sort.field},${sort.desc ? "desc" : "asc"}`,
	});
	if (status) query.set("status", status);
	if (branchId) query.set("branchId", branchId);
	if (departmentId) query.set("departmentId", departmentId);
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

/** One pending request is enough to read the API's total of them. */
const PENDING_COUNT_QUERY: LeaveQuery = {
	page: 1,
	size: 1,
	sort: { field: "requestedAt", desc: true },
	status: "PENDING",
};

/**
 * How many requests wait for a decision across everything the person may
 * read, whatever unit a page shows: the total of a one-row page of pending
 * requests. Polled like the notification count, and under the `leave` key,
 * so every decision or application refreshes it at once.
 */
export const pendingLeaveCountQuery = (
	companyId: string,
	allowed = true
): UndefinedInitialDataOptions<
	ListPage<LeaveRequest>,
	Error,
	number,
	readonly ["leave", string, "pending-count"]
> =>
	queryOptions({
		queryKey: ["leave", companyId, "pending-count"] as const,
		queryFn: allowed
			? ({ signal }): Promise<ListPage<LeaveRequest>> =>
					fetchLeaveRequests(companyId, PENDING_COUNT_QUERY, signal)
			: skipToken,
		select: (page) => page.total,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		refetchInterval: 30_000,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
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

/** The longest remarks the API keeps, in characters. */
export const LEAVE_NOTES_MAX_LENGTH = 1000;

/** What applying for leave sends: inclusive ISO dates, and remarks only when some were written. */
export type LeaveRequestBody = {
	/** The code of one of the company's applicable leave types. */
	leaveType: string;
	startDate: string;
	endDate: string;
	notes?: string;
	/** Only when recording: the reviewer confirmed taking the person off their shifts. */
	takeOffRosteredDays?: boolean;
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

/** The longest approval comment the API keeps, in characters. */
export const APPROVAL_COMMENT_MAX_LENGTH = 2000;

/** Grants a pending request; the reviewer is the caller. A blank comment sends no body, which means none. */
export const approveLeaveRequest = (
	companyId: string,
	membershipId: string,
	leaveRequestId: string,
	comment = "",
	takeOffRosteredDays = false
): Promise<LeaveRequest> =>
	apiRequest(
		`${memberLeavePath(companyId, membershipId)}/${encodeURIComponent(leaveRequestId)}/approval`,
		leaveRequestSchema,
		comment.trim() === "" && !takeOffRosteredDays
			? { method: "POST" }
			: {
					method: "POST",
					body: {
						...(comment.trim() === "" ? {} : { comment: comment.trim() }),
						...(takeOffRosteredDays ? { takeOffRosteredDays } : {}),
					},
				}
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

const leaveRequestPath = (
	companyId: string,
	membershipId: string,
	leaveRequestId: string
): string =>
	`${memberLeavePath(companyId, membershipId)}/${encodeURIComponent(leaveRequestId)}`;

/** The longest remark on recorded, changed or cancelled leave, in characters. */
export const LEAVE_REMARK_MAX_LENGTH = 500;

const rosteredDaySchema = z.object({
	day: z.iso.date(),
	minutes: z.number().int().nonnegative(),
});

/** A day of a period the person holds a shift on. */
export type RosteredDay = z.infer<typeof rosteredDaySchema>;

/** Every rostered-days answer of a company, for refreshing them after a refusal. */
export const rosteredDaysKey = (
	companyId: string
): readonly ["leave", string, "rostered-days"] =>
	["leave", companyId, "rostered-days"] as const;

/**
 * The days of a period the person holds a shift on: the caller's own without
 * `memberId`. `allowed` false asks for nothing.
 */
export const rosteredDaysQuery = (
	companyId: string,
	period: { start: string; end: string },
	memberId?: string,
	allowed = true
): UndefinedInitialDataOptions<
	Array<RosteredDay>,
	Error,
	Array<RosteredDay>,
	readonly ["leave", string, "rostered-days", string, string, string]
> =>
	queryOptions({
		queryKey: [
			...rosteredDaysKey(companyId),
			memberId ?? "me",
			period.start,
			period.end,
		] as const,
		queryFn: allowed
			? ({ signal }): Promise<Array<RosteredDay>> =>
					apiRequest(
						`${memberId ? memberLeavePath(companyId, memberId) : `${companyPath(companyId)}/me/leave-requests`}/rostered-days?${new URLSearchParams({ startDate: period.start, endDate: period.end }).toString()}`,
						z.array(rosteredDaySchema),
						{ signal, responseFormat: "record" }
					)
			: skipToken,
		meta: memberId
			? administrativeMeta(companyId, { record: true })
			: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});

const leaveChangeSchema = z.object({
	/** Any string: a kind added later must not fail the history. */
	kind: z.string(),
	affectedDay: z.iso.date().nullable(),
	beforeLeaveTypeName: z.string().nullable(),
	afterLeaveTypeName: z.string().nullable(),
	beforeStartDate: z.iso.date().nullable(),
	beforeEndDate: z.iso.date().nullable(),
	afterStartDate: z.iso.date().nullable(),
	afterEndDate: z.iso.date().nullable(),
	/** Null when the caller may not read the request's remarks. */
	remark: z.string().nullable(),
	changedByMembershipId: z.string(),
	changedByName: z.string(),
	changedAt: z.iso.datetime({ offset: true }),
});

/** One line of a request's history. */
export type LeaveChange = z.infer<typeof leaveChangeSchema>;

/** One request's history, oldest first: the caller's own without `memberId`. */
export const leaveHistoryQuery = (
	companyId: string,
	requestId: string,
	memberId?: string
): UndefinedInitialDataOptions<
	Array<LeaveChange>,
	Error,
	Array<LeaveChange>,
	readonly ["leave", string, "history", string, string]
> =>
	queryOptions({
		queryKey: [
			"leave",
			companyId,
			"history",
			memberId ?? "me",
			requestId,
		] as const,
		queryFn: ({ signal }) =>
			apiRequest(
				`${memberId ? memberLeavePath(companyId, memberId) : `${companyPath(companyId)}/me/leave-requests`}/${encodeURIComponent(requestId)}/changes`,
				z.array(leaveChangeSchema),
				{ signal, responseFormat: "record" }
			),
		meta: memberId
			? administrativeMeta(companyId, { record: true })
			: selfMeta(companyId),
		retry,
	});

/** What recording approved leave sends. */
export type RecordLeaveBody = {
	leaveType: string;
	startDate: string;
	endDate: string;
	remark: string;
	takeOffRosteredDays: boolean;
};

/** Records approved leave on a member's behalf. */
export const recordLeave = (
	companyId: string,
	membershipId: string,
	body: RecordLeaveBody
): Promise<LeaveRequest> =>
	apiRequest(
		`${memberLeavePath(companyId, membershipId)}/approved`,
		leaveRequestSchema,
		{ method: "POST", body }
	);

/** What changing approved leave sends; a left-out field keeps what the request holds. */
export type ChangeLeaveBody = {
	leaveType?: string;
	startDate?: string;
	endDate?: string;
	remark: string;
	takeOffRosteredDays: boolean;
};

/** Changes an approved request's type or dates. */
export const changeLeave = (
	companyId: string,
	request: LeaveRequest,
	body: ChangeLeaveBody
): Promise<LeaveRequest> =>
	apiRequest(
		leaveRequestPath(companyId, request.membershipId, request.leaveRequestId),
		leaveRequestSchema,
		{ method: "PATCH", body }
	);

/** Cancels an approved request. */
export const cancelLeave = (
	companyId: string,
	request: LeaveRequest,
	remark: string
): Promise<LeaveRequest> =>
	apiRequest(
		`${leaveRequestPath(companyId, request.membershipId, request.leaveRequestId)}/cancellation`,
		leaveRequestSchema,
		{ method: "POST", body: { remark } }
	);

/** Where one day of a member's approved request is changed or cancelled. */
const leaveDayPath = (
	companyId: string,
	membershipId: string,
	leaveRequestId: string,
	day: string
): string =>
	`${leaveRequestPath(companyId, membershipId, leaveRequestId)}/days/${encodeURIComponent(day)}`;

/** Changes one day's leave type, splitting the request around it. */
export const changeLeaveDay = (
	companyId: string,
	membershipId: string,
	leaveRequestId: string,
	day: string,
	body: { leaveType: string; remark: string }
): Promise<LeaveRequest> =>
	apiRequest(
		`${leaveDayPath(companyId, membershipId, leaveRequestId, day)}/change`,
		leaveRequestSchema,
		{ method: "POST", body }
	);

/** Cancels one day of an approved request, splitting the request around it. */
export const cancelLeaveDay = (
	companyId: string,
	membershipId: string,
	leaveRequestId: string,
	day: string,
	remark: string
): Promise<LeaveRequest> =>
	apiRequest(
		`${leaveDayPath(companyId, membershipId, leaveRequestId, day)}/cancellation`,
		leaveRequestSchema,
		{ method: "POST", body: { remark } }
	);

/** Withdraws the caller's own pending request. */
export const withdrawLeave = (
	companyId: string,
	leaveRequestId: string
): Promise<LeaveRequest> =>
	apiRequest(
		`${companyPath(companyId)}/me/leave-requests/${encodeURIComponent(leaveRequestId)}/withdrawal`,
		leaveRequestSchema,
		{ method: "POST" }
	);
