import {
	skipToken,
	useQuery,
	type QueryKey,
	type UseQueryResult,
} from "@tanstack/react-query";
import { ApiProblemError, isDecisionEngineStale } from "@/common/problem";
import type { ListPage } from "@/common/schemas";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import {
	accessiblePreviousData,
	administrativeMeta,
} from "@/features/workspace/queryAccess";
import { workspaceQuery } from "@/features/workspace/api";
import { useAccess } from "@/features/workspace/useAccess";
import {
	type AccessRole,
	type Branch,
	type Department,
	fetchAccessRoles,
	fetchBranches,
	fetchDepartments,
	fetchJobTitles,
	type JobTitle,
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
	| { status: "hidden" }
	| {
			status: "pending";
			/** The last try was refused while access is updated; another follows shortly. */
			stillUpdating?: boolean;
	  }
	| {
			status: "error";
			/** The API is still updating access after a recent change; reading again soon will pass. */
			stillUpdating: boolean;
			/** Reads the list again. */
			retry: () => void;
	  }
	| ({ status: "ready" } & ListPage<T>);

/** A failed read as a list state: whether the API is still updating access, and how to read it again. */
const failedRead = (
	query: UseQueryResult<unknown>
): Extract<OrganisationList<never>, { status: "error" }> => ({
	status: "error",
	stillUpdating: isDecisionEngineStale(query.error),
	retry: (): void => {
		void query.refetch();
	},
});

export const useOrganisationList = <T>(
	companyId: string,
	permission: PermissionKey,
	key: QueryKey,
	fetchPage: (signal: AbortSignal) => Promise<ListPage<T>>,
	enabled = true
): OrganisationList<T> => {
	const access = useAccess();
	// The same workspace read useAccess makes, to read it again when it failed.
	const workspace = useQuery({ ...workspaceQuery, retry });
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

	if (access.status === "pending") return { status: "pending" };
	if (access.status === "error") return failedRead(workspace);
	if (!allowed) return { status: "hidden" };
	if (list.error instanceof ApiProblemError && list.error.status === 403)
		return { status: "hidden" };
	if (list.isError) return failedRead(list);
	if (list.data === undefined)
		return {
			status: "pending",
			stillUpdating: isDecisionEngineStale(list.failureReason),
		};
	return { status: "ready", ...list.data };
};

export const useBranches = (
	companyId: string,
	query: ListQuery,
	enabled = true
): OrganisationList<Branch> =>
	useOrganisationList(
		companyId,
		"branch:read",
		["branches", query],
		(signal) => fetchBranches(companyId, query, signal),
		enabled
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
