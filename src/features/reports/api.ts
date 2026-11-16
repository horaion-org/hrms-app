import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	schedulesReadPath,
	searchOf,
	type DayRange,
} from "@/features/dashboard/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import type { UnitSelection } from "@/features/workspace/unitSearch";

/*
 * The two reads only Reports shows: staffing against each staffing rule,
 * and how much published rosters changed. Overtime is the dashboard's read.
 */

/** Every Reports query key starts `["reports", companyId, …]`. */
export const REPORTS_QUERY_ROOT = "reports";

/** How long an Reports answer is fresh before it is read again. */
const STALE_TIME_MS = 60_000;

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

/** The changes to published rosters of the weeks in the range and units. */
export const fetchRosterChanges = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	signal?: AbortSignal
): Promise<Array<RosterChangeDepartment>> =>
	apiRequest(
		`${schedulesReadPath(companyId, "roster-changes")}${searchOf(units, range)}`,
		rosterChangesSchema,
		{ signal }
	).then((answer) => answer.departments);

/** The key one Reports read is cached under. */
const reportsKey = (
	companyId: string,
	read: string,
	units: UnitSelection,
	range: DayRange
): ReadonlyArray<unknown> =>
	[REPORTS_QUERY_ROOT, companyId, read, units, range] as const;

/** Staffing by rule; `allowed` false asks for nothing. */
export const staffingQuery = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	allowed: boolean
): QueryOptionsFor<Array<StaffingRule>, ReadonlyArray<unknown>> =>
	queryOptions({
		queryKey: reportsKey(companyId, "staffing", units, range),
		queryFn: allowed
			? ({ signal }): Promise<Array<StaffingRule>> =>
					fetchStaffing(companyId, units, range, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: STALE_TIME_MS,
		retry,
	});

/** Changes to published rosters; `allowed` false asks for nothing. */
export const rosterChangesQuery = (
	companyId: string,
	units: UnitSelection,
	range: DayRange,
	allowed: boolean
): QueryOptionsFor<Array<RosterChangeDepartment>, ReadonlyArray<unknown>> =>
	queryOptions({
		queryKey: reportsKey(companyId, "rosterChanges", units, range),
		queryFn: allowed
			? ({ signal }): Promise<Array<RosterChangeDepartment>> =>
					fetchRosterChanges(companyId, units, range, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: STALE_TIME_MS,
		retry,
	});
