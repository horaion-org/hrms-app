import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import { companyPath } from "@/common/companyPath";
import {
	overtimeSchema,
	searchOf,
	shortagesSchema,
	staffingSchema,
	type DayRange,
	type MonthSpan,
	type Overtime,
	type Shortage,
	type StaffingRule,
} from "@/features/dashboard/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import type { UnitSelection } from "@/features/workspace/unitSearch";

/*
 * The reads behind Reports and the overview, each under `report:read` on
 * its own route (hrms-backend-v2 docs/adr/0097): the shifts short, staffing
 * by rule, overtime against the ceiling, and how much published rosters
 * changed. Home reads shortages and staffing through the roster's own key
 * (`features/dashboard/api`), so the two never share a route.
 */

/** Every Reports query key starts `["reports", companyId, …]`. */
export const REPORTS_QUERY_ROOT = "reports";

/** How long an Reports answer is fresh before it is read again. */
const STALE_TIME_MS = 60_000;

/** The Reports reads under the company: `/companies/{id}/reports/{read}`. */
export const reportsReadPath = (companyId: string, read: string): string =>
	`${companyPath(companyId)}/reports/${read}`;

const rosterChangeReasonSchema = z.object({
	/** The change's reason, as the roster's history names it. */
	reason: z.string(),
	changes: z.number().int(),
	days: z.number().int(),
});

/** How often one reason changed published rosters. */
export type RosterChangeReasonCount = z.infer<typeof rosterChangeReasonSchema>;

const rosterChangeDepartmentSchema = z.object({
	branchId: z.string(),
	branchName: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	publishedWeeks: z.number().int(),
	totalChanges: z.number().int(),
	reasons: z.array(rosterChangeReasonSchema),
});

/** One department's changes to its published rosters. */
export type RosterChangeDepartment = z.infer<
	typeof rosterChangeDepartmentSchema
>;

const rosterChangesSchema = z.object({
	from: z.string(),
	to: z.string(),
	departments: z.array(rosterChangeDepartmentSchema),
});

/** The changes to published rosters of the weeks in the range and units. */
export const fetchRosterChanges = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	signal?: AbortSignal
): Promise<Array<RosterChangeDepartment>> =>
	apiRequest(
		`${reportsReadPath(companyId, "roster-changes")}${searchOf(units, range)}`,
		rosterChangesSchema,
		{ signal }
	).then((answer) => answer.departments);

/** The shifts short in the range and units, as Reports reads them. */
export const fetchReportShortages = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	signal?: AbortSignal
): Promise<Array<Shortage>> =>
	apiRequest(
		`${reportsReadPath(companyId, "shortages")}${searchOf(units, range)}`,
		shortagesSchema,
		{ signal }
	).then((answer) => answer.shortages);

/** Each staffing rule in the range and units, as Reports reads it. */
export const fetchReportStaffing = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	signal?: AbortSignal
): Promise<Array<StaffingRule>> =>
	apiRequest(
		`${reportsReadPath(companyId, "staffing")}${searchOf(units, range)}`,
		staffingSchema,
		{ signal }
	).then((answer) => answer.rules);

/** Overtime by department and month in the span and units. */
export const fetchReportOvertime = (
	companyId: string,
	units: UnitSelection,
	span: MonthSpan,
	signal?: AbortSignal
): Promise<Overtime> =>
	apiRequest(
		`${reportsReadPath(companyId, "overtime")}${searchOf(units, span)}`,
		overtimeSchema,
		{ signal }
	);

/** The key one Reports read is cached under. */
const reportsKey = (
	companyId: string,
	read: string,
	units: UnitSelection,
	range: { from: string; to: string }
): ReadonlyArray<unknown> =>
	[REPORTS_QUERY_ROOT, companyId, read, units, range] as const;

/** One administrative Reports read; `allowed` false asks for nothing. */
const reportsQuery = <T>(
	companyId: string,
	read: string,
	units: UnitSelection,
	range: { from: string; to: string },
	fetcher: (signal: AbortSignal) => Promise<T>,
	allowed: boolean
): QueryOptionsFor<T, ReadonlyArray<unknown>> =>
	queryOptions({
		queryKey: reportsKey(companyId, read, units, range),
		queryFn: allowed ? ({ signal }): Promise<T> => fetcher(signal) : skipToken,
		meta: administrativeMeta(companyId),
		staleTime: STALE_TIME_MS,
		retry,
	});

/** The shifts short; `allowed` false asks for nothing. */
export const reportShortagesQuery = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	allowed: boolean
): QueryOptionsFor<Array<Shortage>, ReadonlyArray<unknown>> =>
	reportsQuery(
		companyId,
		"shortages",
		units,
		range,
		(signal) => fetchReportShortages(companyId, units, range, signal),
		allowed
	);

/** Staffing by rule; `allowed` false asks for nothing. */
export const reportStaffingQuery = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	allowed: boolean
): QueryOptionsFor<Array<StaffingRule>, ReadonlyArray<unknown>> =>
	reportsQuery(
		companyId,
		"staffing",
		units,
		range,
		(signal) => fetchReportStaffing(companyId, units, range, signal),
		allowed
	);

/** Overtime by department and month; `allowed` false asks for nothing. */
export const reportOvertimeQuery = (
	companyId: string,
	units: UnitSelection,
	span: MonthSpan,
	allowed: boolean
): QueryOptionsFor<Overtime, ReadonlyArray<unknown>> =>
	reportsQuery(
		companyId,
		"overtime",
		units,
		span,
		(signal) => fetchReportOvertime(companyId, units, span, signal),
		allowed
	);

/** Changes to published rosters; `allowed` false asks for nothing. */
export const rosterChangesQuery = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	allowed: boolean
): QueryOptionsFor<Array<RosterChangeDepartment>, ReadonlyArray<unknown>> =>
	reportsQuery(
		companyId,
		"rosterChanges",
		units,
		range,
		(signal) => fetchRosterChanges(companyId, units, range, signal),
		allowed
	);
