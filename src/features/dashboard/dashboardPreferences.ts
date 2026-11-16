import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import { DASHBOARD_QUERY_ROOT } from "@/features/dashboard/api";
import { selfMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/*
 * Which Home sections a member hides (ADR-0096): read and replaced whole at
 * `/me/dashboard-preferences`, so the choice follows them to every device.
 * Nothing saved reads as nothing hidden.
 */

const preferencesSchema = z.object({
	/** The keys of the sections the member hides, sorted. */
	hiddenSections: z.array(z.string()),
});

export type DashboardPreferences = z.infer<typeof preferencesSchema>;

/** The member's own preferences under the company. */
const preferencesPath = (companyId: string): string =>
	`${companyPath(companyId)}/me/dashboard-preferences`;

/** The key the member's preferences are cached under. */
const preferencesKey = (companyId: string): ReadonlyArray<unknown> =>
	[DASHBOARD_QUERY_ROOT, companyId, "preferences"] as const;

/** Reads the sections the member hides. */
export const fetchDashboardPreferences = (
	companyId: string,
	signal?: AbortSignal
): Promise<DashboardPreferences> =>
	apiRequest(preferencesPath(companyId), preferencesSchema, { signal });

/** Makes the hidden sections exactly these; the answer is the stored list. */
export const replaceDashboardPreferences = (
	companyId: string,
	hiddenSections: ReadonlyArray<string>
): Promise<DashboardPreferences> =>
	apiRequest(preferencesPath(companyId), preferencesSchema, {
		method: "PUT",
		body: { hiddenSections },
	});

/** The member's preferences, which any member may read for themself. */
export const dashboardPreferencesQuery = (
	companyId: string
): QueryOptionsFor<DashboardPreferences, ReadonlyArray<unknown>> =>
	queryOptions({
		queryKey: preferencesKey(companyId),
		queryFn: ({ signal }): Promise<DashboardPreferences> =>
			fetchDashboardPreferences(companyId, signal),
		// Own read: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		retry,
	});

/** What Home knows of the member's choice: still loading, or the hidden keys. */
export type HiddenSections =
	| { status: "pending" }
	| { status: "ready"; hiddenSections: ReadonlyArray<string> };

/**
 * The sections the member hides. A failed read hides nothing, so Home still
 * shows every section rather than none.
 */
export const useHiddenSections = (companyId: string): HiddenSections => {
	const query = useQuery(dashboardPreferencesQuery(companyId));
	if (query.isError) return { status: "ready", hiddenSections: [] };
	if (query.data === undefined) return { status: "pending" };
	return { status: "ready", hiddenSections: query.data.hiddenSections };
};

/**
 * Saves the hidden sections. Home changes at once; a refused save puts the
 * previous choice back, and the caller says so.
 */
export const useSaveHiddenSections = (
	companyId: string
): UseMutationResult<
	DashboardPreferences,
	Error,
	ReadonlyArray<string>,
	{ previous: DashboardPreferences | undefined }
> => {
	const client = useQueryClient();
	const queryKey = preferencesKey(companyId);
	return useMutation({
		mutationFn: (hiddenSections) =>
			replaceDashboardPreferences(companyId, hiddenSections),
		onMutate: async (hiddenSections) => {
			await client.cancelQueries({ queryKey });
			const previous = client.getQueryData<DashboardPreferences>(queryKey);
			client.setQueryData<DashboardPreferences>(queryKey, {
				hiddenSections: [...hiddenSections],
			});
			return { previous };
		},
		onError: (_error, _hiddenSections, context) => {
			client.setQueryData(queryKey, context?.previous);
		},
		onSuccess: (saved) => {
			client.setQueryData(queryKey, saved);
		},
	});
};
