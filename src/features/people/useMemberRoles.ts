import { skipToken, useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import { fetchMemberAccessRoleAssignments } from "@/features/organisation/api";
import { useAccessRoles } from "@/features/organisation/useOrganisationList";
import { memberRoles, type MemberRoles } from "@/features/people/memberRoles";
import { retry } from "@/features/workspace/retry";
import { useCan } from "@/features/workspace/useCan";

const BY_NAME = { sort: { field: "name", desc: false } } as const;

/**
 * The system roles a person holds. Roles have no unit, so reading them needs
 * the key company-wide; without it, or when the API refuses with a 403, they
 * are `hidden`.
 */
export const useMemberRoles = (
	companyId: string,
	membershipId: string
): MemberRoles => {
	const allowed = useCan()("access_role:read");
	// Inside the Organisation entries, so assigning or removing a role reloads it.
	const assignments = useQuery({
		queryKey: ["organisation", companyId, "member-assignments", membershipId],
		queryFn: allowed
			? (): ReturnType<typeof fetchMemberAccessRoleAssignments> =>
					fetchMemberAccessRoleAssignments(companyId, membershipId)
			: skipToken,
		retry,
	});
	const roles = useAccessRoles(companyId, BY_NAME);

	if (!allowed) return { status: "hidden" };
	if (
		assignments.error instanceof ApiProblemError &&
		assignments.error.status === 403
	)
		return { status: "hidden" };
	if (assignments.isError) return { status: "error" };
	if (roles.status !== "ready") return { status: roles.status };
	if (assignments.data === undefined) return { status: "pending" };
	return { status: "ready", roles: memberRoles(assignments.data, roles.items) };
};
