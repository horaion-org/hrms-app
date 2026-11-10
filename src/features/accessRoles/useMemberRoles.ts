import { skipToken, useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	accessRoleKeys,
	fetchMemberAccessRoleAssignments,
} from "@/features/accessRoles/api";
import { useAccessRoles } from "@/features/accessRoles/useAccessRoles";
import {
	memberRoles,
	type MemberRoles,
} from "@/features/accessRoles/memberRoles";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import { useAccess } from "@/features/workspace/useAccess";

const BY_NAME = { sort: { field: "name", desc: false } } as const;

/**
 * The access roles a person holds. Asked for with `access_role:read` held
 * anywhere: the API returns only the assignments whose own place is inside
 * the caller's read scopes. Without the key, or when the API refuses with a
 * 403, they are `hidden`. With no person (`membershipId` empty), nothing is
 * asked and they stay `pending`.
 */
export const useMemberRoles = (
	companyId: string,
	membershipId: string
): MemberRoles => {
	const allowed = useAccess().canAnywhere("access_role:read");
	// Inside the Organisation entries, so assigning or removing a role reloads it.
	const assignments = useQuery({
		queryKey: accessRoleKeys.memberAssignments(companyId, membershipId),
		queryFn:
			allowed && membershipId
				? ({ signal }): ReturnType<typeof fetchMemberAccessRoleAssignments> =>
						fetchMemberAccessRoleAssignments(companyId, membershipId, signal)
				: skipToken,
		meta: administrativeMeta(companyId),
		retry,
	});
	const roles = useAccessRoles(companyId, BY_NAME);

	if (!allowed) return { status: "hidden" };
	if (!membershipId) return { status: "pending" };
	if (
		assignments.error instanceof ApiProblemError &&
		assignments.error.status === 403
	)
		return { status: "hidden" };
	if (assignments.isError) return { status: "error" };
	if (roles.status !== "ready") return { status: roles.status };
	if (assignments.data === undefined) return { status: "pending" };
	return {
		status: "ready",
		roles: memberRoles(assignments.data, roles.items),
		assignments: assignments.data,
		accessRoles: roles.items,
	};
};
