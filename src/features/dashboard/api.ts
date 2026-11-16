import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import type { PermissionKey } from "@/features/workspace/permissionContract.generated";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import type { UnitSelection } from "@/features/workspace/unitSearch";

/*
 * The schedules reads behind the manager dashboard and Reports: shifts
 * short, rostered days off, overtime against the ceiling, and the open
 * cover offers in the person's units. Each is guarded by the API; the app
 * only shows what it answers.
 */

/** Every dashboard query key starts `["dashboard", companyId, …]`. */
export const DASHBOARD_QUERY_ROOT = "dashboard";

/** How long a dashboard answer is fresh before it is read again. */
const STALE_TIME_MS = 30_000;

/** A span of days, both included, as ISO dates. */
export type DayRange = { from: string; to: string };

/** A span of months, both included, as "yyyy-MM". */
export type MonthSpan = { from: string; to: string };

/** The schedules reads under the company: `/companies/{id}/schedules/{read}`. */
export const schedulesReadPath = (companyId: string, read: string): string =>
	`${companyPath(companyId)}/schedules/${read}`;

/** The query string of a read: the range, then the chosen units when set. */
export const searchOf = (
	units: UnitSelection,
	range?: { from: string; to: string }
): string => {
	const search = new URLSearchParams(range ?? {});
	if (units.branchId) search.set("branchId", units.branchId);
	if (units.departmentId) search.set("departmentId", units.departmentId);
	return search.size > 0 ? `?${search.toString()}` : "";
};

const shortageSchema = z.object({
	scheduleId: z.string(),
	scheduleStatus: z.string(),
	branchId: z.string(),
	branchName: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	day: z.string(),
	/** The frozen shift's public id, as Find cover's `cover` parameter names it. */
	shiftId: z.string(),
	shiftName: z.string(),
	startTime: z.string(),
	endTime: z.string(),
	shortBy: z.number().int(),
	shortSinceGeneration: z.number().int(),
});

/** One shift short on one day of a live roster. */
export type Shortage = z.infer<typeof shortageSchema>;

const shortagesSchema = z.object({
	from: z.string(),
	to: z.string(),
	shortages: z.array(shortageSchema),
});

const dayOffSchema = z.object({
	day: z.string(),
	membershipId: z.string(),
	displayName: z.string().nullable(),
	departmentId: z.string(),
	departmentName: z.string(),
	dayTypeName: z.string().nullable(),
});

/** One person rostered off on one day. */
export type DayOff = z.infer<typeof dayOffSchema>;

const daysOffSchema = z.object({
	from: z.string(),
	to: z.string(),
	daysOff: z.array(dayOffSchema),
});

/** How close a person is to the monthly overtime ceiling. */
export const overtimeStandingSchema = z.enum(["NEAR", "OVER"]);

export type OvertimeStanding = z.infer<typeof overtimeStandingSchema>;

const overtimeMemberSchema = z.object({
	membershipId: z.string(),
	displayName: z.string().nullable(),
	overtimeMinutes: z.number().int(),
	standing: overtimeStandingSchema,
});

/** One person at or over the share of the ceiling. */
export type OvertimeMember = z.infer<typeof overtimeMemberSchema>;

const overtimeDepartmentSchema = z.object({
	branchId: z.string(),
	branchName: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	month: z.string(),
	/** Null when the company sets no monthly ceiling. */
	ceilingMinutes: z.number().int().nullable(),
	overtimeMinutes: z.number().int(),
	members: z.array(overtimeMemberSchema),
});

/** One department's month of overtime. */
export type OvertimeDepartment = z.infer<typeof overtimeDepartmentSchema>;

const overtimeSchema = z.object({
	from: z.string(),
	to: z.string(),
	/** The share of the ceiling at which a person counts as near it. */
	nearSharePercent: z.number().int(),
	departments: z.array(overtimeDepartmentSchema),
});

/** Overtime by department and month. */
export type Overtime = z.infer<typeof overtimeSchema>;

const teamCoverOfferSchema = z.object({
	coverOfferId: z.string(),
	scheduleId: z.string(),
	branchId: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	day: z.string(),
	shiftId: z.string(),
	shiftName: z.string(),
	startTime: z.string(),
	endTime: z.string(),
	membershipId: z.string(),
	displayName: z.string().nullable(),
	sentAt: z.string(),
	expiresAt: z.string().nullable(),
});

/** One cover offer sent in the person's units that nobody has answered yet. */
export type TeamCoverOffer = z.infer<typeof teamCoverOfferSchema>;

const teamCoverOffersSchema = z.object({
	offers: z.array(teamCoverOfferSchema),
});

/** The shifts short in the range and units. */
export const fetchShortages = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	signal?: AbortSignal
): Promise<Array<Shortage>> =>
	apiRequest(
		`${schedulesReadPath(companyId, "shortages")}${searchOf(units, range)}`,
		shortagesSchema,
		{ signal }
	).then((answer) => answer.shortages);

/** The rostered days off in the range and units. */
export const fetchDaysOff = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	signal?: AbortSignal
): Promise<Array<DayOff>> =>
	apiRequest(
		`${schedulesReadPath(companyId, "days-off")}${searchOf(units, range)}`,
		daysOffSchema,
		{ signal }
	).then((answer) => answer.daysOff);

/** Overtime by department and month in the span and units. */
export const fetchOvertime = (
	companyId: string,
	units: UnitSelection,
	span: MonthSpan,
	signal?: AbortSignal
): Promise<Overtime> =>
	apiRequest(
		`${schedulesReadPath(companyId, "overtime")}${searchOf(units, span)}`,
		overtimeSchema,
		{ signal }
	);

/** The open cover offers in the units, newest first. */
export const fetchTeamCoverOffers = (
	companyId: string,
	units: UnitSelection,
	signal?: AbortSignal
): Promise<Array<TeamCoverOffer>> =>
	apiRequest(
		`${schedulesReadPath(companyId, "cover-offers")}${searchOf(units)}`,
		teamCoverOffersSchema,
		{ signal }
	).then((answer) => answer.offers);

/** The key one dashboard read is cached under. */
export const dashboardKey = (
	companyId: string,
	read: string,
	units: UnitSelection,
	range?: { from: string; to: string }
): ReadonlyArray<unknown> =>
	[DASHBOARD_QUERY_ROOT, companyId, read, units, range ?? null] as const;

/** One administrative dashboard read; `allowed` false asks for nothing. */
const dashboardQuery = <T>(
	companyId: string,
	queryKey: ReadonlyArray<unknown>,
	fetcher: (signal: AbortSignal) => Promise<T>,
	allowed: boolean
): QueryOptionsFor<T, ReadonlyArray<unknown>> =>
	queryOptions({
		queryKey,
		queryFn: allowed ? ({ signal }): Promise<T> => fetcher(signal) : skipToken,
		meta: administrativeMeta(companyId),
		staleTime: STALE_TIME_MS,
		retry,
	});

/** The shifts short; `allowed` false asks for nothing. */
export const shortagesQuery = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	allowed: boolean
): QueryOptionsFor<Array<Shortage>, ReadonlyArray<unknown>> =>
	dashboardQuery(
		companyId,
		dashboardKey(companyId, "shortages", units, range),
		(signal) => fetchShortages(companyId, units, range, signal),
		allowed
	);

/** The rostered days off; `allowed` false asks for nothing. */
export const daysOffQuery = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	allowed: boolean
): QueryOptionsFor<Array<DayOff>, ReadonlyArray<unknown>> =>
	dashboardQuery(
		companyId,
		dashboardKey(companyId, "daysOff", units, range),
		(signal) => fetchDaysOff(companyId, units, range, signal),
		allowed
	);

/** Overtime by department and month; `allowed` false asks for nothing. */
export const overtimeQuery = (
	companyId: string,
	units: UnitSelection,
	span: MonthSpan,
	allowed: boolean
): QueryOptionsFor<Overtime, ReadonlyArray<unknown>> =>
	dashboardQuery(
		companyId,
		dashboardKey(companyId, "overtime", units, span),
		(signal) => fetchOvertime(companyId, units, span, signal),
		allowed
	);

/** The open cover offers in the units; `allowed` false asks for nothing. */
export const teamCoverOffersQuery = (
	companyId: string,
	units: UnitSelection,
	allowed: boolean
): QueryOptionsFor<Array<TeamCoverOffer>, ReadonlyArray<unknown>> =>
	dashboardQuery(
		companyId,
		dashboardKey(companyId, "coverOffers", units),
		(signal) => fetchTeamCoverOffers(companyId, units, signal),
		allowed
	);

/*
 * Staffing by rule: what each staffing rule asks for against the people
 * who could fill it. Home names a rule nobody can staff; Reports lists
 * them all.
 */

const staffingRuleSchema = z.object({
	departmentId: z.string(),
	departmentName: z.string(),
	branchName: z.string(),
	ruleName: z.string(),
	ruleType: z.string(),
	/** How many people the rule asks for on each of its shifts. */
	headcount: z.number().int(),
	/** The job titles the rule counts together. */
	jobTitles: z.array(z.object({ jobTitleId: z.string(), name: z.string() })),
	/** How many people hold one of those job titles. */
	peopleWithTitles: z.number().int(),
	shifts: z.array(
		z.object({
			shiftId: z.string(),
			name: z.string(),
			daysAWeek: z.number().int(),
		})
	),
	/** The people short on the rule's shifts over the range, added up. */
	gapsInRange: z.number().int(),
	/** The person-days a week the rule asks for: its headcount times the days its shifts run. */
	neededShiftDaysAWeek: z.number().int(),
	/** The days a week the title holders are contracted to work, added up; null when none has terms. */
	holderDaysAWeek: z.number().int().nullable(),
});

/** One staffing rule against the people who could fill it. */
export type StaffingRule = z.infer<typeof staffingRuleSchema>;

const staffingSchema = z.object({
	from: z.string(),
	to: z.string(),
	rules: z.array(staffingRuleSchema),
});

/** Each staffing rule in the range and units. */
export const fetchStaffing = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	signal?: AbortSignal
): Promise<Array<StaffingRule>> =>
	apiRequest(
		`${schedulesReadPath(companyId, "staffing")}${searchOf(units, range)}`,
		staffingSchema,
		{ signal }
	).then((answer) => answer.rules);

/** Staffing by rule; `allowed` false asks for nothing. */
export const staffingQuery = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	allowed: boolean
): QueryOptionsFor<Array<StaffingRule>, ReadonlyArray<unknown>> =>
	dashboardQuery(
		companyId,
		dashboardKey(companyId, "staffing", units, range),
		(signal) => fetchStaffing(companyId, units, range, signal),
		allowed
	);

/*
 * Two reads beyond the schedules (ADR-0095): the approvals waiting in the
 * person's units, and who joins, ends probation or leaves.
 */

/** Holding this anywhere is what lets a person see the approvals waiting in their units. */
export const APPROVAL_READ_KEYS: ReadonlyArray<PermissionKey> = [
	"approval:read",
];

const waitingApprovalSchema = z.object({
	approvalInstanceId: z.string(),
	/** What waits: a roster to publish or a leave request, as the approval names it. */
	subjectType: z.string(),
	/** The public id of the roster or leave request. */
	subjectId: z.string(),
	branchId: z.string(),
	branchName: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	/** Who asked; null once they left the company. */
	memberDisplayName: z.string().nullable(),
	currentStepOrder: z.number().int(),
	stepCount: z.number().int(),
	/** When the open step began to wait, as an ISO instant. */
	waitingSince: z.string(),
	/** Whether the flow's managers were told the step stalled. */
	stalled: z.boolean(),
});

/** One approval waiting in the person's units. */
export type WaitingApproval = z.infer<typeof waitingApprovalSchema>;

const waitingApprovalsSchema = z.object({
	approvals: z.array(waitingApprovalSchema),
});

/** What happens to a person on a day: they join, their probation ends, or they leave. */
export const peopleEventKindSchema = z.enum([
	"JOINS",
	"PROBATION_ENDS",
	"LEAVES",
]);

export type PeopleEventKind = z.infer<typeof peopleEventKindSchema>;

const peopleEventSchema = z.object({
	kind: peopleEventKindSchema,
	day: z.string(),
	membershipId: z.string(),
	/** Null once the member left. */
	displayName: z.string().nullable(),
	branchId: z.string(),
	branchName: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
});

/** One person's join, probation end or leaving day. */
export type PeopleEvent = z.infer<typeof peopleEventSchema>;

const peopleEventsSchema = z.object({
	from: z.string(),
	to: z.string(),
	events: z.array(peopleEventSchema),
});

/** The approvals waiting in the units, oldest first. */
export const fetchWaitingApprovals = (
	companyId: string,
	units: UnitSelection,
	signal?: AbortSignal
): Promise<Array<WaitingApproval>> =>
	apiRequest(
		`${companyPath(companyId)}/approval-instances/waiting${searchOf(units)}`,
		waitingApprovalsSchema,
		{ signal }
	).then((answer) => answer.approvals);

/** Who joins, ends probation or leaves in the range and units, by day. */
export const fetchPeopleEvents = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	signal?: AbortSignal
): Promise<Array<PeopleEvent>> =>
	apiRequest(
		`${companyPath(companyId)}/member-profiles/events${searchOf(units, range)}`,
		peopleEventsSchema,
		{ signal }
	).then((answer) => answer.events);

/** The approvals waiting; `allowed` false asks for nothing. */
export const waitingApprovalsQuery = (
	companyId: string,
	units: UnitSelection,
	allowed: boolean
): QueryOptionsFor<Array<WaitingApproval>, ReadonlyArray<unknown>> =>
	dashboardQuery(
		companyId,
		dashboardKey(companyId, "waitingApprovals", units),
		(signal) => fetchWaitingApprovals(companyId, units, signal),
		allowed
	);

/** The people events; `allowed` false asks for nothing. */
export const peopleEventsQuery = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	allowed: boolean
): QueryOptionsFor<Array<PeopleEvent>, ReadonlyArray<unknown>> =>
	dashboardQuery(
		companyId,
		dashboardKey(companyId, "peopleEvents", units, range),
		(signal) => fetchPeopleEvents(companyId, units, range, signal),
		allowed
	);
