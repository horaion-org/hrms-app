import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	myPreferenceWeekKey,
	myPreferenceWeekQuery,
	replaceMyPreferenceDay,
	teamPreferencesQuery,
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

/** The caller's own week of preferences. */
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

/**
 * One page of a Department's members and their preferences. `hidden` when
 * `shift_preference:read` is held nowhere, whether the workspace says so up
 * front or the API refuses with a 403. `query` undefined asks for nothing.
 */
export type TeamPreferencesState =
	| { status: "pending" | "error" | "hidden" }
	| { status: "ready"; page: TeamPreferencePage };

/** The team list's page for `query`, read only where the key is held somewhere. */
export const useTeamPreferences = (
	companyId: string,
	query: TeamPreferenceQuery | undefined
): TeamPreferencesState => {
	const access = useAccess();
	const allowed = access.canAny(SHIFT_PREFERENCE_READ_KEYS, "anywhere");
	const page = useQuery(
		teamPreferencesQuery(
			companyId,
			query ?? { departmentId: "", weekStartMonday: "", page: 0 },
			allowed && query !== undefined
		)
	);
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
		onSuccess: () =>
			client.invalidateQueries({
				queryKey: myPreferenceWeekKey(companyId, weekStartMonday),
			}),
	});
};
