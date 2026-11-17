import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	memberPreferenceWeekKey,
	memberPreferenceWeekQuery,
	myPreferenceWeekKey,
	myPreferenceWeekQuery,
	replaceMemberPreferenceDay,
	replaceMyPreferenceDay,
	teamPreferencesQuery,
	teamPreferencesRoot,
	type MyPreferenceWeek,
	type PreferenceDay,
	type TeamPreferencePage,
	type TeamPreferenceQuery,
} from "@/features/shiftPreferences/api";
import { SHIFT_PREFERENCE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { useAccess } from "@/features/workspace/useAccess";

/** A 403: the person's grants don't reach what was asked for, whatever the workspace said. */
const isRefused = (error: Error | null): boolean =>
	error instanceof ApiProblemError && error.status === 403;

/** One week of preferences: the caller's own, or a member's. */
export type MyPreferenceWeekState =
	{ status: "pending" | "error" } | { status: "ready"; week: MyPreferenceWeek };

/** The caller's preferences for the week starting `weekStartMonday`; nothing granted is needed. */
export const useMyPreferenceWeek = (
	companyId: string,
	weekStartMonday: string
): MyPreferenceWeekState => {
	const week = useQuery(myPreferenceWeekQuery(companyId, weekStartMonday));
	if (week.isError) return { status: "error" };
	if (week.data === undefined) return { status: "pending" };
	return { status: "ready", week: week.data };
};

/** A member's preferences for the week starting `weekStartMonday`, read under `shift_preference:read`. */
export const useMemberPreferenceWeek = (
	companyId: string,
	membershipId: string,
	weekStartMonday: string
): MyPreferenceWeekState => {
	const week = useQuery(
		memberPreferenceWeekQuery(companyId, membershipId, weekStartMonday)
	);
	if (week.isError) return { status: "error" };
	if (week.data === undefined) return { status: "pending" };
	return { status: "ready", week: week.data };
};

/**
 * One page of a Department's members and their preferences. `hidden` when
 * `shift_preference:read` is held nowhere, whether the workspace says so up
 * front or the API refuses with a 403.
 */
export type TeamPreferencesState =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; page: TeamPreferencePage };

/** The team list's page for `query`, read only where the key is held somewhere. */
export const useTeamPreferences = (
	companyId: string,
	query: TeamPreferenceQuery
): TeamPreferencesState => {
	const access = useAccess();
	const allowed = access.canAny(SHIFT_PREFERENCE_READ_KEYS, "anywhere");
	const page = useQuery(teamPreferencesQuery(companyId, query, allowed));
	if (access.status !== "ready") return { status: access.status };
	if (!allowed || isRefused(page.error)) return { status: "hidden" };
	if (page.isError) return { status: "error" };
	if (page.data === undefined) return { status: "pending" };
	return { status: "ready", page: page.data };
};

/** One day's new set of preferred shifts. */
export type DayChange = { date: string; shiftIds: ReadonlyArray<string> };

/**
 * Replaces one day of the caller's week, then reads that week again; no
 * other entry is touched. Sending the same set twice leaves the same day.
 */
export const useReplaceMyPreferenceDay = (
	companyId: string,
	weekStartMonday: string
): UseMutationResult<PreferenceDay, Error, DayChange> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: ({ date, shiftIds }) =>
			replaceMyPreferenceDay(companyId, date, shiftIds),
		meta: { successMessage: "shiftPreferences.saved" },
		onSuccess: () =>
			client.invalidateQueries({
				queryKey: myPreferenceWeekKey(companyId, weekStartMonday),
			}),
	});
};

/**
 * Replaces one day of a member's week, then reads that week and every page
 * of the team list again, so the row the manager opened it from shows the
 * change.
 */
export const useReplaceMemberPreferenceDay = (
	companyId: string,
	membershipId: string,
	weekStartMonday: string
): UseMutationResult<PreferenceDay, Error, DayChange> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: ({ date, shiftIds }) =>
			replaceMemberPreferenceDay(companyId, membershipId, date, shiftIds),
		meta: { successMessage: "shiftPreferences.saved" },
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({
					queryKey: memberPreferenceWeekKey(
						companyId,
						membershipId,
						weekStartMonday
					),
				}),
				client.invalidateQueries({
					queryKey: teamPreferencesRoot(companyId),
				}),
			]),
	});
};
