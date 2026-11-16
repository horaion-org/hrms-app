import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import { pagedSchema } from "@/common/schemas";
import {
	accessiblePreviousData,
	administrativeMeta,
	selfMeta,
} from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * The shift preference routes of the API: the caller's own week
 * and one day of it, read and replaced with nothing granted; a Department's
 * members for one week, read under `shift_preference:read`, a page at a time.
 * What a generated roster made of them is read on the roster's side
 * (`features/scheduling/preferenceOutcomes`).
 */

/** Members on one page of the team list; the API takes at most 100. */
export const TEAM_PAGE_SIZE = 50;

const choosableShiftSchema = z.object({
	shiftId: z.string(),
	name: z.string(),
	/** "HH:mm"; an end at or before the start runs past midnight. */
	startTime: z.string(),
	endTime: z.string(),
	/** Whether the caller chose it for this day. */
	preferred: z.boolean(),
});

/** A shift the caller may prefer on a day, and whether they did. */
export type ChoosableShift = z.infer<typeof choosableShiftSchema>;

const preferenceDaySchema = z.object({
	date: z.iso.date(),
	/** False for a day before today or more than eight weeks ahead. */
	editable: z.boolean(),
	/** The day's shifts of the caller's Department that need their job title, by start time. */
	shifts: z.array(choosableShiftSchema),
});

/** One day of the caller's week: the shifts they may prefer, the chosen ones marked. */
export type PreferenceDay = z.infer<typeof preferenceDaySchema>;

const myPreferenceWeekSchema = z.object({
	weekStartMonday: z.iso.date(),
	/** The most shifts one day may hold. */
	maxShiftsPerDay: z.number().int().positive(),
	/** Seven days, Monday first. */
	days: z.array(preferenceDaySchema),
});

/** The caller's shift preferences for one week. */
export type MyPreferenceWeek = z.infer<typeof myPreferenceWeekSchema>;

const preferredShiftSchema = z.object({
	shiftId: z.string(),
	name: z.string(),
});

/** A shift someone prefers on a day: its id and name. */
export type PreferredShift = z.infer<typeof preferredShiftSchema>;

const teamMemberWeekSchema = z.object({
	membershipId: z.string(),
	/** Null once the member has been removed; their preferences stay listed. */
	displayName: z.string().nullable(),
	days: z.array(
		z.object({
			date: z.iso.date(),
			shifts: z.array(preferredShiftSchema),
		})
	),
});

/** One member's preferred shifts for one week, as the team list gives them. */
export type TeamMemberWeek = z.infer<typeof teamMemberWeekSchema>;

const teamPageSchema = pagedSchema(teamMemberWeekSchema);

/** One page of a Department's members and their preferences. */
export type TeamPreferencePage = z.infer<typeof teamPageSchema>;

/** Which Department, week and page the team list is read for. */
export type TeamPreferenceQuery = {
	departmentId: string;
	/** "YYYY-MM-DD", a Monday. */
	weekStartMonday: string;
	/** From 0. */
	page: number;
};

/** What a roster made of one person's preference on one day. */
export const PREFERENCE_OUTCOMES = [
	"MET",
	"NOT_MET",
	"NOT_CONSIDERED",
] as const;

/** Why a preference was left out of a generation. */
export const PREFERENCE_REASONS = [
	"ON_LEAVE",
	"SHIFT_NOT_IN_ROSTER",
	"SHIFT_NOT_ON_DAY",
	"ROLE_NOT_STAFFED",
] as const;

/** Met, not met, or left out of the generation. */
export type PreferenceOutcomeKind = (typeof PREFERENCE_OUTCOMES)[number];

/** One reason a preference was left out of a generation. */
export type PreferenceReason = (typeof PREFERENCE_REASONS)[number];

const schedulePreferenceOutcomeSchema = z.object({
	membershipId: z.string(),
	date: z.iso.date(),
	/** The day's preferred shifts, as frozen with the roster. */
	shiftNames: z.array(z.string()),
	outcome: z.enum(PREFERENCE_OUTCOMES),
	/** Set exactly when the outcome is NOT_CONSIDERED. */
	reason: z.enum(PREFERENCE_REASONS).nullable(),
});

/** One person's preference on one day of a roster, and what the roster made of it. */
export type SchedulePreferenceOutcome = z.infer<
	typeof schedulePreferenceOutcomeSchema
>;

/** A roster's preferences and their outcomes, one entry per person and day. */
export const schedulePreferenceOutcomesSchema = z.object({
	scheduleId: z.string(),
	preferences: z.array(schedulePreferenceOutcomeSchema),
});

const myPreferencesPath = (companyId: string): string =>
	`${companyPath(companyId)}/me/shift-preferences`;

/** The caller's own week of preferences. */
export const myPreferenceWeekPath = (
	companyId: string,
	weekStartMonday: string
): string =>
	`${myPreferencesPath(companyId)}?${new URLSearchParams({ weekStartMonday }).toString()}`;

/** One day of the caller's own preferences, replaced as a whole. */
export const myPreferenceDayPath = (companyId: string, date: string): string =>
	`${myPreferencesPath(companyId)}/days/${encodeURIComponent(date)}`;

/** One page of a Department's members and their preferences for a week. */
export const teamPreferencesPath = (
	companyId: string,
	{ departmentId, weekStartMonday, page }: TeamPreferenceQuery
): string => {
	const query = new URLSearchParams({
		departmentId,
		weekStartMonday,
		page: String(page),
		size: String(TEAM_PAGE_SIZE),
	});
	return `${companyPath(companyId)}/shift-preferences?${query.toString()}`;
};

/** The caller's preferences for the week starting `weekStartMonday`. */
export const fetchMyPreferenceWeek = (
	companyId: string,
	weekStartMonday: string,
	signal?: AbortSignal
): Promise<MyPreferenceWeek> =>
	apiRequest(
		myPreferenceWeekPath(companyId, weekStartMonday),
		myPreferenceWeekSchema,
		{ signal }
	);

/** Makes one of the caller's days exactly `shiftIds` and returns it as saved; none clears it. */
export const replaceMyPreferenceDay = (
	companyId: string,
	date: string,
	shiftIds: ReadonlyArray<string>
): Promise<PreferenceDay> =>
	apiRequest(myPreferenceDayPath(companyId, date), preferenceDaySchema, {
		method: "PUT",
		body: { shiftIds },
	});

/** One page of a Department's members and their preferences; only members in reach are listed. */
export const fetchTeamPreferences = (
	companyId: string,
	query: TeamPreferenceQuery,
	signal?: AbortSignal
): Promise<TeamPreferencePage> =>
	apiRequest(teamPreferencesPath(companyId, query), teamPageSchema, { signal });

/** Every shift preference entry of the company. */
export const shiftPreferencesRoot = (
	companyId: string
): readonly ["shiftPreferences", string] =>
	["shiftPreferences", companyId] as const;

/** The key of the caller's own week. */
export const myPreferenceWeekKey = (
	companyId: string,
	weekStartMonday: string
): readonly ["shiftPreferences", string, "me", string] =>
	[...shiftPreferencesRoot(companyId), "me", weekStartMonday] as const;

/** The key of one page of the team list. */
export const teamPreferencesKey = (
	companyId: string,
	{ departmentId, weekStartMonday, page }: TeamPreferenceQuery
): readonly ["shiftPreferences", string, "team", string, string, number] =>
	[
		...shiftPreferencesRoot(companyId),
		"team",
		departmentId,
		weekStartMonday,
		page,
	] as const;

/** The caller's own week; it needs nothing granted. */
export const myPreferenceWeekQuery = (
	companyId: string,
	weekStartMonday: string
): QueryOptionsFor<MyPreferenceWeek, ReturnType<typeof myPreferenceWeekKey>> =>
	queryOptions({
		queryKey: myPreferenceWeekKey(companyId, weekStartMonday),
		queryFn: ({ signal }): Promise<MyPreferenceWeek> =>
			fetchMyPreferenceWeek(companyId, weekStartMonday, signal),
		// Own record: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});

/** One page of the team list; `allowed` false asks for nothing. */
export const teamPreferencesQuery = (
	companyId: string,
	query: TeamPreferenceQuery,
	allowed = true
): QueryOptionsFor<TeamPreferencePage, ReturnType<typeof teamPreferencesKey>> =>
	queryOptions({
		queryKey: teamPreferencesKey(companyId, query),
		queryFn: allowed
			? ({ signal }): Promise<TeamPreferencePage> =>
					fetchTeamPreferences(companyId, query, signal)
			: skipToken,
		// Keep the current rows on screen while another week or page loads, unless withdrawn.
		placeholderData: accessiblePreviousData(),
		meta: administrativeMeta(companyId),
		staleTime: 30_000,
		retry,
	});
