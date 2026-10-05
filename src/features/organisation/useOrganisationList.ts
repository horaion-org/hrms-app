import {
	keepPreviousData,
	skipToken,
	useQuery,
	type QueryKey,
} from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import { workspaceQuery } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { useCan } from "@/features/workspace/useCan";
import {
	fetchAccessRoles,
	fetchBranches,
	fetchDepartments,
	fetchJobTitles,
	type AccessRole,
	type Branch,
	type Department,
	type JobTitle,
	type ListPage,
	type ListQuery,
} from "@/features/organisation/api";
import { retry } from "@/features/organisation/useOrganisationOverview";

/**
 * One Organisation list. `hidden` when the person's grants don't reach it,
 * whether the workspace says so up front or the API refuses with a 403.
 */
export type OrganisationList<T> =
	| { status: "pending" | "error" | "hidden" }
	| ({ status: "ready" } & ListPage<T>);

const useOrganisationList = <T>(
	companyId: string,
	permission: PermissionKey,
	key: QueryKey,
	fetchPage: () => Promise<ListPage<T>>
): OrganisationList<T> => {
	const workspace = useQuery({ ...workspaceQuery, retry });
	const allowed = useCan()(permission);
	const list = useQuery({
		queryKey: ["organisation", companyId, ...key],
		retry,
		// Keep the current rows on screen while a new sort or filter loads.
		placeholderData: keepPreviousData,
		queryFn: allowed ? fetchPage : skipToken,
	});

	if (workspace.isPending) return { status: "pending" };
	if (workspace.isError) return { status: "error" };
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return { status: "error" };
	if (list.data === undefined) return { status: "pending" };
	return { status: "ready", ...list.data };
};

export const useBranches = (
	companyId: string,
	query: ListQuery
): OrganisationList<Branch> =>
	useOrganisationList(companyId, "branch:read", ["branches", query], () =>
		fetchBranches(companyId, query)
	);

export const useDepartments = (
	companyId: string,
	query: ListQuery
): OrganisationList<Department> =>
	useOrganisationList(
		companyId,
		"department:read",
		["departments", query],
		() => fetchDepartments(companyId, query)
	);

export const useJobTitles = (
	companyId: string,
	query: ListQuery
): OrganisationList<JobTitle> =>
	useOrganisationList(companyId, "job_title:read", ["job-titles", query], () =>
		fetchJobTitles(companyId, query)
	);

export const useAccessRoles = (
	companyId: string,
	query: ListQuery
): OrganisationList<AccessRole> =>
	useOrganisationList(
		companyId,
		"access_role:read",
		["access-roles", query],
		() => fetchAccessRoles(companyId, query)
	);
