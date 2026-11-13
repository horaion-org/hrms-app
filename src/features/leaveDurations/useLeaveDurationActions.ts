import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	createLeaveDuration,
	deleteLeaveDuration,
	leaveDurationCatalogueQuery,
	leaveDurationsKey,
	reorderLeaveDurations,
	updateLeaveDuration,
	type LeaveDurationBody,
	type LeaveDurationOrderBody,
	type ManagedLeaveDuration,
	type UpdateLeaveDurationBody,
} from "@/features/leaveDurations/api";

type Replaced = { leaveDurationId: string; body: UpdateLeaveDurationBody };

export type LeaveDurationActions = {
	createLeaveDuration: UseMutationResult<
		ManagedLeaveDuration,
		Error,
		LeaveDurationBody
	>;
	updateLeaveDuration: UseMutationResult<ManagedLeaveDuration, Error, Replaced>;
	deleteLeaveDuration: UseMutationResult<void, Error, string>;
	reorderLeaveDurations: UseMutationResult<
		Array<ManagedLeaveDuration>,
		Error,
		LeaveDurationOrderBody
	>;
};

/**
 * Adding, replacing, deleting and reordering the company's leave durations.
 * The apply form offers durations through the leave options, so each write
 * reloads the company's durations and leave queries once it settles. A
 * refusal reloads them too: it usually means the list on screen is out of
 * date (another admin changed it), and retrying from the old list would be
 * refused again.
 */
export const useLeaveDurationActions = (
	companyId: string
): LeaveDurationActions => {
	const client = useQueryClient();
	const reload = (): Promise<unknown> =>
		Promise.all([
			client.invalidateQueries({ queryKey: leaveDurationsKey(companyId) }),
			client.invalidateQueries({ queryKey: ["leave", companyId] }),
		]);
	return {
		createLeaveDuration: useMutation({
			meta: { successMessage: false },
			mutationFn: (body: LeaveDurationBody) =>
				createLeaveDuration(companyId, body),
			onSettled: reload,
		}),
		updateLeaveDuration: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ leaveDurationId, body }: Replaced) =>
				updateLeaveDuration(companyId, leaveDurationId, body),
			onSettled: reload,
		}),
		deleteLeaveDuration: useMutation({
			meta: { successMessage: false },
			mutationFn: (leaveDurationId: string) =>
				deleteLeaveDuration(companyId, leaveDurationId),
			onSettled: reload,
		}),
		reorderLeaveDurations: useMutation({
			meta: { successMessage: false },
			mutationFn: (body: LeaveDurationOrderBody) =>
				reorderLeaveDurations(companyId, body),
			// The answer is the whole list in its new order: show it at once.
			onSuccess: (catalogue) => {
				client.setQueryData(
					leaveDurationCatalogueQuery(companyId).queryKey,
					catalogue
				);
			},
			onSettled: reload,
		}),
	};
};
