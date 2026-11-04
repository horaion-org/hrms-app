import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { renameCompany } from "@/features/settings/api";
import { workspaceQuery } from "@/features/workspace/api";

/**
 * Saves the workspace name and confirms it with a toast. The workspace is
 * reloaded afterwards, because the General settings form reads the name from
 * it. The company switcher reads names from `/me`, which this does not reload.
 */
export const useRenameWorkspace = (
	companyId: string
): UseMutationResult<string, Error, string> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (name: string) => renameCompany(companyId, name),
		meta: { successMessage: "settings.general.saved" },
		onSuccess: () =>
			client.invalidateQueries({ queryKey: workspaceQuery.queryKey }),
	});
};
