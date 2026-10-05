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
	setAccessRoleAssignmentStatus,
	type AccessRoleGrant,
	type UnitStatus,
} from "@/features/organisation/api";
import type { AccessRoleAssignmentRow } from "@/features/organisation/AccessRoleAssignments";
import { workspaceQuery } from "@/features/workspace/api";
import { retry } from "@/features/workspace/retry";

/** Who holds an access role and where, as the rows the people table shows. */
export const useAccessRoleHolders = (
	companyId: string,
	accessRoleId: string
): UseQueryResult<Array<AccessRoleAssignmentRow>> =>
	useQuery({
		queryKey: ["organisation", companyId, "access-role-holders", accessRoleId],
		queryFn: () => fetchAccessRoleHolders(companyId, accessRoleId),
		retry,
		select: (holders) =>
			holders.map((holder) => ({
				assignmentId: holder.accessRoleAssignmentId,
				membershipId: holder.companyMembershipId,
				name: holder.displayName,
				status: holder.status,
				branchId: holder.branchId ?? undefined,
				branchName: holder.branchName ?? undefined,
				departmentId: holder.departmentId ?? undefined,
				departmentName: holder.departmentName ?? undefined,
			})),
	});

/**
 * Changes to who holds a role, made together: places to add it at,
 * assignments to remove, and assignments to switch on or off.
 */
export type AccessRoleHoldersChange = {
	grants?: Array<AccessRoleGrant>;
	revokes?: Array<string>;
	statuses?: { assignmentIds: Array<string>; status: UnitStatus };
};

/**
 * Assigning an access role, and removing or switching assignments of it. One request is
 * sent per place, so whatever succeeded before a refusal stays as it is.
 * Either may change what the person themselves can do, so the workspace is
 * refreshed along with the lists.
 */
export const useChangeAccessRoleHolders = (
	companyId: string
): UseMutationResult<void, Error, AccessRoleHoldersChange> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: async ({
			grants = [],
			revokes = [],
			statuses = { assignmentIds: [], status: "ACTIVE" },
		}: AccessRoleHoldersChange) => {
			await Promise.all([
				...grants.map((grant) => grantAccessRole(companyId, grant)),
				...revokes.map((id) => revokeAccessRole(companyId, id)),
				...statuses.assignmentIds.map((id) =>
					setAccessRoleAssignmentStatus(companyId, id, statuses.status)
				),
			]);
		},
		onSettled: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ["organisation", companyId] }),
				client.invalidateQueries({ queryKey: workspaceQuery.queryKey }),
			]),
	});
};
