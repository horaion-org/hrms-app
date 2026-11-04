import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { renameCompany } from "@/features/settings/api";
import { workspaceQuery } from "@/features/workspace/api";

/**
 * Saves the workspace name and confirms it with a toast. Two reads carry the
 * name and both are refreshed afterwards: the workspace (the General
 * settings form) and the person's own `/me` (the company switcher). `/me` is
 * read once per session into the route context, so it is fetched again and
 * the routes re-run to hand the new name to the switcher.
 */
export const useRenameWorkspace = (
	companyId: string
): UseMutationResult<string, Error, string> => {
	const client = useQueryClient();
	const router = useRouter();
	return useMutation({
		mutationFn: (name: string) => renameCompany(companyId, name),
		meta: { successMessage: "settings.general.saved" },
		onSuccess: async () => {
			await Promise.all([
				client.invalidateQueries({ queryKey: workspaceQuery.queryKey }),
				client.refetchQueries({ queryKey: ["me"], exact: true }),
			]);
			await router.invalidate();
		},
	});
};
