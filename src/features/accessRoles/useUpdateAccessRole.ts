import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	updateAccessRole,
	type AccessRole,
	type UpdateAccessRoleBody,
} from "@/features/organisation/api";
import { workspaceQuery } from "@/features/workspace/api";

/**
 * Refreshes the company's lists and activity after changing an access role,
 * and the workspace too: the role may be one the person holds, so what they
 * can do may have changed with it.
 */
export const useUpdateAccessRole = (
	companyId: string,
	accessRoleId: string
): UseMutationResult<AccessRole, Error, UpdateAccessRoleBody> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (body: UpdateAccessRoleBody) =>
			updateAccessRole(companyId, accessRoleId, body),
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ["organisation", companyId] }),
				client.invalidateQueries({ queryKey: workspaceQuery.queryKey }),
			]),
	});
};
