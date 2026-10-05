import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import {
	fetchAccessRoleHolders,
	grantAccessRole,
	revokeAccessRole,
	type AccessRoleGrant,
	type AccessRoleHolder,
} from "@/features/organisation/api";
import { workspaceQuery } from "@/features/workspace/api";
import { retry } from "@/features/workspace/retry";

/** Who holds an access role and where. */
export const useAccessRoleHolders = (
	companyId: string,
	accessRoleId: string
): UseQueryResult<Array<AccessRoleHolder>> =>
	useQuery({
		queryKey: ["organisation", companyId, "access-role-holders", accessRoleId],
		queryFn: () => fetchAccessRoleHolders(companyId, accessRoleId),
		retry,
	});

/**
 * Assigning and removing an access role. Either may change what the person
 * themselves can do, so the workspace is refreshed along with the lists.
 */
export const useChangeAccessRoleHolders = (
	companyId: string
): {
	assign: UseMutationResult<void, Error, Array<AccessRoleGrant>>;
	revoke: UseMutationResult<void, Error, string>;
} => {
	const client = useQueryClient();
	const refresh = (): Promise<unknown> =>
		Promise.all([
			client.invalidateQueries({ queryKey: ["organisation", companyId] }),
			client.invalidateQueries({ queryKey: workspaceQuery.queryKey }),
		]);
	return {
		assign: useMutation({
			// One request per place; whatever was granted before a refusal stays granted.
			mutationFn: async (grants: Array<AccessRoleGrant>) => {
				await Promise.all(
					grants.map((grant) => grantAccessRole(companyId, grant))
				);
			},
			onSettled: refresh,
		}),
		revoke: useMutation({
			mutationFn: (accessRoleAssignmentId: string) =>
				revokeAccessRole(companyId, accessRoleAssignmentId),
			onSuccess: refresh,
		}),
	};
};
