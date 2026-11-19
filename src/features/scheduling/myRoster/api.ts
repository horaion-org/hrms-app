import {
	queryOptions,
	type UnusedSkipTokenOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import { SCHEDULING_QUERY_ROOT } from "@/features/scheduling/paths";
import {
	scheduleAssignmentSchema,
	withCoveredDays,
} from "@/features/scheduling/schedules/api";
import { selfMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * A member's own view of a published roster they are on, read under `/me`
 * without `schedule:read`. The API admits only a published schedule of the
 * company that rosters the caller, and answers 404 for anything else.
 */

const myRosterSchema = z
	.object({
		scheduleId: z.string(),
		name: z.string(),
		branchName: z.string(),
		departmentName: z.string(),
		/** The IANA zone of the branch, which the roster's days are in. */
		timeZone: z.string(),
		/** ISO dates; the period starts on a Monday. */
		periodStart: z.string(),
		periodEnd: z.string(),
		/** The days of the week the schedule covers (API ADR-0113); staff see these only. */
		coveredFrom: z.string().nullish(),
		coveredTo: z.string().nullish(),
		/** Every member's days, as the manager's roster reads them. */
		assignments: z.array(scheduleAssignmentSchema),
	})
	.transform(withCoveredDays);

/** A published schedule's week and department, with its whole roster. */
export type MyRoster = z.infer<typeof myRosterSchema>;

/** The member's own roster route for one schedule. */
export const myRosterPath = (companyId: string, scheduleId: string): string =>
	`${companyPath(companyId)}/me/schedules/${encodeURIComponent(scheduleId)}`;

export const fetchMyRoster = (
	companyId: string,
	scheduleId: string,
	signal?: AbortSignal
): Promise<MyRoster> =>
	apiRequest(myRosterPath(companyId, scheduleId), myRosterSchema, { signal });

/** The key the caller's own view of one roster is cached under. */
export const myRosterKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "me", string] =>
	[SCHEDULING_QUERY_ROOT, companyId, "me", scheduleId] as const;

/** One published roster the caller is on; a 404 is final and not retried. */
export const myRosterQuery = (
	companyId: string,
	scheduleId: string
): UnusedSkipTokenOptions<
	MyRoster,
	Error,
	MyRoster,
	ReturnType<typeof myRosterKey>
> =>
	queryOptions({
		queryKey: myRosterKey(companyId, scheduleId),
		queryFn: ({ signal }) => fetchMyRoster(companyId, scheduleId, signal),
		// Own read: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/*
 * A member's own days over a range of dates, across every published roster
 * that rosters them, read under `/me` without `schedule:read`. Rosters on
 * review, drafts and other members' rows are never in the answer.
 */

/** A published roster the caller is on that overlaps the dates asked. */
const myRosterDaysRosterSchema = z.object({
	scheduleId: z.string(),
	name: z.string(),
	branchName: z.string(),
	departmentName: z.string(),
	/** The IANA zone of the branch, which the roster's days are in. */
	timeZone: z.string(),
	/** The ISO days the roster covers. */
	coveredFrom: z.string(),
	coveredTo: z.string(),
});

const myRosterDaysSchema = z.object({
	/** The ISO dates asked, both included. */
	from: z.string(),
	to: z.string(),
	/** By the first day covered, then name. */
	rosters: z.array(myRosterDaysRosterSchema),
	/** The caller's own rows only, by day; each names the roster it is on. */
	days: z.array(
		z.object({
			scheduleId: z.string(),
			assignment: scheduleAssignmentSchema,
		})
	),
});

/** A published roster the caller is on, without its rows. */
export type MyRosterDaysRoster = z.infer<typeof myRosterDaysRosterSchema>;

/** The caller's own days from `from` to `to`, and the published rosters they come from. */
export type MyRosterDays = z.infer<typeof myRosterDaysSchema>;

/** The member's own roster days route for the ISO dates `from` to `to`, both included. */
export const myRosterDaysPath = (
	companyId: string,
	from: string,
	to: string
): string =>
	`${companyPath(companyId)}/me/roster-days?${new URLSearchParams({ from, to }).toString()}`;

/** Reads the caller's own days from `from` to `to`. */
export const fetchMyRosterDays = (
	companyId: string,
	from: string,
	to: string,
	signal?: AbortSignal
): Promise<MyRosterDays> =>
	apiRequest(myRosterDaysPath(companyId, from, to), myRosterDaysSchema, {
		signal,
	});

/** The key the caller's own days over a range are cached under. */
export const myRosterDaysKey = (
	companyId: string,
	from: string,
	to: string
): readonly ["scheduling", string, "me", "roster-days", string, string] =>
	[SCHEDULING_QUERY_ROOT, companyId, "me", "roster-days", from, to] as const;

/** The caller's own published days from `from` to `to`; none found is an empty answer, not an error. */
export const myRosterDaysQuery = (
	companyId: string,
	from: string,
	to: string
): UnusedSkipTokenOptions<
	MyRosterDays,
	Error,
	MyRosterDays,
	ReturnType<typeof myRosterDaysKey>
> =>
	queryOptions({
		queryKey: myRosterDaysKey(companyId, from, to),
		queryFn: ({ signal }) => fetchMyRosterDays(companyId, from, to, signal),
		// Own read: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});
