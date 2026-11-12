import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	SCHEDULING_QUERY_ROOT,
	scheduleMonthPath,
	scheduleMonthsPath,
} from "@/features/scheduling/paths";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import type { UnitSelection } from "@/features/workspace/unitSelection";

/*
 * Schedules by month (ADR-0074 in the API). A week belongs to the month its
 * Monday falls in; its state is derived by the API from the week's live
 * schedule, so the app only shows it.
 */

// A state a newer API adds reads as UNKNOWN instead of failing the answer, as a schedule's status does.
export const weekStateSchema = z
	.enum([
		"PUBLISHED",
		"TO_REVIEW",
		"TENTATIVE",
		"GENERATING",
		"FAILED",
		"REJECTED",
		"DRAFT",
		"NOT_GENERATED",
		"UNKNOWN",
	])
	.catch("UNKNOWN");

/**
 * What the manager sees of one week: TO_REVIEW is the Department's earliest
 * generated week awaiting a decision, TENTATIVE a generated week after it.
 */
export type WeekState = z.infer<typeof weekStateSchema>;

const monthWeekSchema = z.object({
	/** The week's Monday. */
	periodStart: z.string(),
	periodEnd: z.string(),
	state: weekStateSchema,
	/** The week's live schedule, or null when it has none. */
	scheduleId: z.string().nullable(),
	/** Seven days, Monday first, when the week has a roster to show; otherwise empty. */
	days: z.array(z.object({ date: z.string(), shortShifts: z.number() })),
	/** Cells changed by hand, or null without a roster. */
	handChangedDays: z.number().nullable(),
});

/** One week of a Department's month, as the month page shows it. */
export type MonthWeek = z.infer<typeof monthWeekSchema>;

export const scheduleMonthSchema = z.object({
	/** "2026-11". */
	month: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	branchId: z.string(),
	branchName: z.string(),
	weeks: z.array(monthWeekSchema),
});

/** One Department's month, its weeks in Monday order. */
export type ScheduleMonth = z.infer<typeof scheduleMonthSchema>;

export const scheduleMonthSummarySchema = z.object({
	month: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	branchId: z.string(),
	branchName: z.string(),
	weeks: z.array(
		z.object({
			periodStart: z.string(),
			state: weekStateSchema,
			scheduleId: z.string().nullable(),
		})
	),
});

/** One Department's month on the Schedules tab: which weeks are in which state. */
export type ScheduleMonthSummary = z.infer<typeof scheduleMonthSummarySchema>;

/** One week of a month summary. */
export type WeekSummary = ScheduleMonthSummary["weeks"][number];

const scheduleMonthSummaryListSchema = z.array(scheduleMonthSummarySchema);

/** The months asked for, both included, as "yyyy-MM". */
export type MonthRange = { from: string; to: string };

/** One Department's month; a Department out of reach is a 404. */
export const fetchScheduleMonth = (
	companyId: string,
	departmentId: string,
	month: string,
	signal?: AbortSignal
): Promise<ScheduleMonth> =>
	apiRequest(
		`${scheduleMonthPath(companyId, month)}?${new URLSearchParams({ departmentId }).toString()}`,
		scheduleMonthSchema,
		{ signal }
	);

/** Each Department's months in the range and the chosen units; only months with a schedule are answered. */
export const fetchScheduleMonthSummaries = (
	companyId: string,
	units: UnitSelection,
	range: MonthRange,
	signal?: AbortSignal
): Promise<Array<ScheduleMonthSummary>> => {
	const search = new URLSearchParams({ from: range.from, to: range.to });
	if (units.branchId) search.set("branchId", units.branchId);
	if (units.departmentId) search.set("departmentId", units.departmentId);
	return apiRequest(
		`${scheduleMonthsPath(companyId)}?${search.toString()}`,
		scheduleMonthSummaryListSchema,
		{ signal }
	);
};

/** The key every month read is cached under; the scheduling reload after a write reaches it. */
export const scheduleMonthsKey = (
	companyId: string
): readonly ["scheduling", string, "months"] =>
	[SCHEDULING_QUERY_ROOT, companyId, "months"] as const;

/** The key one Department's month is cached under. */
export const scheduleMonthKey = (
	companyId: string,
	departmentId: string,
	month: string
): readonly ["scheduling", string, "months", string, string] =>
	[...scheduleMonthsKey(companyId), departmentId, month] as const;

/** The key the month summaries of the chosen units and range are cached under. */
export const scheduleMonthSummariesKey = (
	companyId: string,
	units: UnitSelection,
	range: MonthRange
): readonly [
	"scheduling",
	string,
	"months",
	"summaries",
	UnitSelection,
	MonthRange,
] => [...scheduleMonthsKey(companyId), "summaries", units, range] as const;

/** How often a month with a week being generated is read again. */
const GENERATION_POLL_INTERVAL_MS = 15_000;

/**
 * One Department's month; `allowed` false asks for nothing. While a week is
 * being generated it is read again every 15 seconds, and no longer after.
 */
export const scheduleMonthQuery = (
	companyId: string,
	departmentId: string,
	month: string,
	allowed = true
): QueryOptionsFor<ScheduleMonth, ReturnType<typeof scheduleMonthKey>> =>
	queryOptions({
		queryKey: scheduleMonthKey(companyId, departmentId, month),
		queryFn: allowed
			? ({ signal }): Promise<ScheduleMonth> =>
					fetchScheduleMonth(companyId, departmentId, month, signal)
			: skipToken,
		// One Department's month: a 404 may mean it moved out of reach.
		meta: administrativeMeta(companyId, { record: true }),
		staleTime: 30_000,
		refetchInterval: (query): number | false =>
			query.state.data?.weeks.some((week) => week.state === "GENERATING")
				? GENERATION_POLL_INTERVAL_MS
				: false,
		refetchIntervalInBackground: false,
		retry,
	});

/** The month summaries of the chosen units and range; `allowed` false asks for nothing. */
export const scheduleMonthSummariesQuery = (
	companyId: string,
	units: UnitSelection,
	range: MonthRange,
	allowed = true
): QueryOptionsFor<
	Array<ScheduleMonthSummary>,
	ReturnType<typeof scheduleMonthSummariesKey>
> =>
	queryOptions({
		queryKey: scheduleMonthSummariesKey(companyId, units, range),
		queryFn: allowed
			? ({ signal }): Promise<Array<ScheduleMonthSummary>> =>
					fetchScheduleMonthSummaries(companyId, units, range, signal)
			: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
