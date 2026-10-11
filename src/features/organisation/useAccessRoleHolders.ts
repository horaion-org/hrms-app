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
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/** Who holds an access role and where, as the rows the people table shows. */
export const useAccessRoleHolders = (
	companyId: string,
	accessRoleId: string
): UseQueryResult<Array<AccessRoleAssignmentRow>> =>
	useQuery({
		queryKey: ["organisation", companyId, "access-role-holders", accessRoleId],
		queryFn: ({ signal }) =>
			fetchAccessRoleHolders(companyId, accessRoleId, signal),
		meta: administrativeMeta(companyId),
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
 * Some of a change's requests failed while others succeeded. Each request
 * is independent (there is no all-or-nothing on the API), so what succeeded
 * stays done; `failures` keeps the refusals for the dialog to explain, and
 * the lists are reloaded so the person sees where things now stand.
 */
export class PartialChangeError extends Error {
	public override name = "PartialChangeError";
	public readonly total: number;
	public readonly failures: ReadonlyArray<unknown>;

	public constructor({
		message,
		...options
	}: {
		message: string;
		total: number;
		failures: ReadonlyArray<unknown>;
	}) {
		super(message);
		this.total = options.total;
		this.failures = options.failures;
	}
}

/**
 * The refusal that best explains a failed change: the only failure of a
 * single request as it is, otherwise the first failure of several.
 */
export const firstFailure = (error: unknown): unknown =>
	error instanceof PartialChangeError ? error.failures[0] : error;

/**
 * Assigning an access role, and removing or switching assignments of it.
 * One request is sent per place and every one is allowed to settle, so a
 * refusal of one never hides the outcome of the others: when every request
 * fails, the first refusal is thrown as it is; when only some do, a
 * `PartialChangeError` says how many. Either way the lists and the
 * workspace are reloaded, since the person may hold the role themselves.
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
			const outcomes = await Promise.allSettled([
				...grants.map((grant) => grantAccessRole(companyId, grant)),
				...revokes.map((id) => revokeAccessRole(companyId, id)),
				...statuses.assignmentIds.map((id) =>
					setAccessRoleAssignmentStatus(companyId, id, statuses.status)
				),
			]);
			const failures = outcomes.flatMap((outcome) =>
				outcome.status === "rejected" ? [outcome.reason as unknown] : []
			);
			if (failures.length === 0) return;
			const [only] = failures;
			if (failures.length === outcomes.length && only instanceof Error)
				throw only;
			throw new PartialChangeError({
				message: `${failures.length} of ${outcomes.length} changes failed`,
				total: outcomes.length,
				failures,
			});
		},
		onSettled: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ["organisation", companyId] }),
				client.invalidateQueries({ queryKey: workspaceQuery.queryKey }),
			]),
	});
};
