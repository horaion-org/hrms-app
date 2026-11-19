import { queryOptions, skipToken } from "@tanstack/react-query";
import type { z } from "zod";
import { apiRequest } from "@/common/api-client";
import type { DepartmentPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import { myRosterKey, myRosterPath } from "@/features/scheduling/myRoster/api";
import { schedulePath } from "@/features/scheduling/paths";
import { scheduleKey } from "@/features/scheduling/schedules/api";
import { schedulePreferenceOutcomesSchema } from "@/features/shiftPreferences/api";
import { administrativeMeta, selfMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * What a generated roster made of each person's shift preferences, read once
 * per roster beside its rows: under `schedule:read` at its Department, or
 * the caller's own on a published roster they are on, under `/me`.
 */

/** A roster's preferences and their outcomes, one entry per person and day. */
export type RosterPreferenceOutcomes = z.infer<
	typeof schedulePreferenceOutcomesSchema
>;

const OUTCOMES_SEGMENT = "shift-preferences";

/** Every person's outcomes on one roster. */
export const fetchRosterPreferenceOutcomes = (
	companyId: string,
	unit: DepartmentPath,
	scheduleId: string,
	signal?: AbortSignal
): Promise<RosterPreferenceOutcomes> =>
	apiRequest(
		`${schedulePath(companyId, unit, scheduleId)}/${OUTCOMES_SEGMENT}`,
		schedulePreferenceOutcomesSchema,
		{ signal }
	);

/** The caller's own outcomes on a published roster they are on. */
export const fetchMyRosterPreferenceOutcomes = (
	companyId: string,
	scheduleId: string,
	signal?: AbortSignal
): Promise<RosterPreferenceOutcomes> =>
	apiRequest(
		`${myRosterPath(companyId, scheduleId)}/${OUTCOMES_SEGMENT}`,
		schedulePreferenceOutcomesSchema,
		{ signal }
	);

/** The key a roster's outcomes are cached under: per run and revision, as its rows are. */
export const rosterPreferenceOutcomesKey = (
	companyId: string,
	scheduleId: string,
	runId: string | null,
	revision: number
): readonly [
	"scheduling",
	string,
	"schedules",
	string,
	"shiftPreferences",
	string | null,
	number,
] =>
	[
		...scheduleKey(companyId, scheduleId),
		"shiftPreferences",
		runId,
		revision,
	] as const;

/** The key the caller's own outcomes on one roster are cached under. */
export const myRosterPreferenceOutcomesKey = (
	companyId: string,
	scheduleId: string
): readonly ["scheduling", string, "me", string, "shiftPreferences"] =>
	[...myRosterKey(companyId, scheduleId), "shiftPreferences"] as const;

/** A roster's outcomes from run `runId` at `revision`; `unit` undefined, or `allowed` false, asks for nothing. */
export const rosterPreferenceOutcomesQuery = (
	companyId: string,
	unit: DepartmentPath | undefined,
	scheduleId: string,
	runId: string | null,
	revision: number,
	allowed = true
): QueryOptionsFor<
	RosterPreferenceOutcomes,
	ReturnType<typeof rosterPreferenceOutcomesKey>
> =>
	queryOptions({
		queryKey: rosterPreferenceOutcomesKey(
			companyId,
			scheduleId,
			runId,
			revision
		),
		queryFn:
			allowed && unit
				? ({ signal }): Promise<RosterPreferenceOutcomes> =>
						fetchRosterPreferenceOutcomes(companyId, unit, scheduleId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** The caller's own outcomes on one published roster; it needs nothing granted. */
export const myRosterPreferenceOutcomesQuery = (
	companyId: string,
	scheduleId: string
): QueryOptionsFor<
	RosterPreferenceOutcomes,
	ReturnType<typeof myRosterPreferenceOutcomesKey>
> =>
	queryOptions({
		queryKey: myRosterPreferenceOutcomesKey(companyId, scheduleId),
		queryFn: ({ signal }): Promise<RosterPreferenceOutcomes> =>
			fetchMyRosterPreferenceOutcomes(companyId, scheduleId, signal),
		// Own read: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});
