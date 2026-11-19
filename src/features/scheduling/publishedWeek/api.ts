import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { DepartmentPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import {
	schedulesPath,
	SCHEDULING_QUERY_ROOT,
} from "@/features/scheduling/paths";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * Whether a Department's week already has its published roster. A
 * department keeps one published schedule per week, so another schedule
 * for the week can't be generated or published; the wizard and the roster
 * page say so first.
 */

const publishedWeekSchema = z.object({
	periodStart: z.string(),
	/** The week's published schedule; absent or null when it has none. */
	scheduleId: z
		.string()
		.nullish()
		.transform((id) => id ?? null),
});

/** A week and the schedule published for it, if any. */
export type PublishedWeek = z.infer<typeof publishedWeekSchema>;

/** A part's days of its week (API ADR-0113): the published part overlapping them is asked for. */
export type CoveredDays = { coveredFrom: string; coveredTo: string };

/**
 * Asks which schedule, if any, is the Department's published roster for the
 * week starting `periodStart`; with `covered`, the published part
 * overlapping those days, so a later part isn't held up by an earlier one.
 */
export const fetchPublishedWeek = (
	companyId: string,
	unit: DepartmentPath,
	periodStart: string,
	covered?: CoveredDays,
	signal?: AbortSignal
): Promise<PublishedWeek> =>
	apiRequest(
		`${schedulesPath(companyId, unit)}/published-week?${new URLSearchParams({ periodStart, ...covered }).toString()}`,
		publishedWeekSchema,
		{ signal }
	);

/** Below the company's scheduling root, so every schedule action reloads it. */
export const publishedWeekKey = (
	companyId: string,
	departmentId: string,
	periodStart: string,
	covered?: CoveredDays
): readonly [
	"scheduling",
	string,
	"published-week",
	string,
	string,
	CoveredDays | undefined,
] =>
	[
		SCHEDULING_QUERY_ROOT,
		companyId,
		"published-week",
		departmentId,
		periodStart,
		covered,
	] as const;

/**
 * A Department's week, asked only with a `unit` where the person may read
 * schedules and a chosen week: the answer names a schedule they can open.
 */
export const publishedWeekQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	periodStart: string | undefined,
	covered?: CoveredDays
): QueryOptionsFor<PublishedWeek, ReturnType<typeof publishedWeekKey>> =>
	queryOptions({
		queryKey: publishedWeekKey(
			companyId,
			unit?.departmentId ?? "",
			periodStart ?? "",
			covered
		),
		queryFn:
			unit && periodStart
				? ({ signal }): Promise<PublishedWeek> =>
						fetchPublishedWeek(companyId, unit, periodStart, covered, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/**
 * The schedule that holds the week, unless it is `ownScheduleId` itself:
 * the published roster never stands in its own way.
 */
export const publishedRosterOtherThan = (
	week: PublishedWeek | undefined,
	ownScheduleId?: string
): string | undefined =>
	week?.scheduleId && week.scheduleId !== ownScheduleId
		? week.scheduleId
		: undefined;
