import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	createBranch,
	type Branch,
	type CreateBranchBody,
} from "@/features/organisation/api";
import { workspaceQuery } from "@/features/workspace/api";

/** Refreshes lists and workspace access so the new Branch is available to selectors. */
export const useCreateBranch = (
	companyId: string
): UseMutationResult<Branch, Error, CreateBranchBody> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateBranchBody) => createBranch(companyId, body),
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ["organisation", companyId] }),
				client.invalidateQueries({ queryKey: workspaceQuery.queryKey }),
			]),
	});
};
