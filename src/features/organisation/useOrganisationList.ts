import { skipToken, useQuery, type QueryKey } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import {
	accessiblePreviousData,
	administrativeMeta,
} from "@/features/workspace/queryAccess";
import { useAccess } from "@/features/workspace/useAccess";
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
 * One Organisation list. `hidden` when the person's grants don't reach it
 * anywhere, whether the workspace says so up front or the API refuses with
 * a 403. The API returns only the rows in units where the key is held, so a
 * person granted at one Branch or Department sees their part of the list.
 */
export type OrganisationList<T> =
	| { status: "pending" | "error" | "hidden" }
	| ({ status: "ready" } & ListPage<T>);

const useOrganisationList = <T>(
	companyId: string,
	permission: PermissionKey,
	key: QueryKey,
	fetchPage: (signal: AbortSignal) => Promise<ListPage<T>>,
	enabled = true
): OrganisationList<T> => {
	const access = useAccess();
	const allowed = access.canAnywhere(permission);
	const list = useQuery({
		queryKey: ["organisation", companyId, ...key],
		retry,
		// Keep the current rows on screen while a new sort or filter loads, unless withdrawn.
		placeholderData: accessiblePreviousData(),
		meta: administrativeMeta(companyId),
		queryFn:
			allowed && enabled
				? ({ signal }): Promise<ListPage<T>> => fetchPage(signal)
				: skipToken,
	});

	if (access.status !== "ready") return { status: access.status };
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
	useOrganisationList(companyId, "branch:read", ["branches", query], (signal) =>
		fetchBranches(companyId, query, signal)
	);

export const useDepartments = (
	companyId: string,
	query: ListQuery
): OrganisationList<Department> =>
	useOrganisationList(
		companyId,
		"department:read",
		["departments", query],
		(signal) => fetchDepartments(companyId, query, signal)
	);

/** `enabled` false asks for nothing yet, e.g. until a Department is chosen to filter by. */
export const useJobTitles = (
	companyId: string,
	query: ListQuery,
	enabled = true
): OrganisationList<JobTitle> =>
	useOrganisationList(
		companyId,
		"job_title:read",
		["job-titles", query],
		(signal) => fetchJobTitles(companyId, query, signal),
		enabled
	);

/**
 * Role definitions are shared company reference data: their names and
 * permission templates are read with `access_role:read` held anywhere.
 * Who holds them, and where, is scoped separately by the API.
 */
export const useAccessRoles = (
	companyId: string,
	query: ListQuery
): OrganisationList<AccessRole> =>
	useOrganisationList(
		companyId,
		"access_role:read",
		["access-roles", query],
		(signal) => fetchAccessRoles(companyId, query, signal)
	);
