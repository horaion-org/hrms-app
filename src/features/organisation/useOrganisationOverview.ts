import {
	skipToken,
	useQuery,
	type UseQueryResult,
} from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import { companyPermissions, workspaceQuery } from "@/features/workspace/api";
import {
	fetchAccessRoleCount,
	fetchActiveBranchCount,
	fetchActiveDepartmentCount,
	fetchRecentActivity,
	type AuditEvent,
} from "@/features/organisation/api";

export const RECENT_ACTIVITY_SIZE = 4;

/** A figure the person may see, or `hidden` when their grants don't reach it. */
export type Visible<T> = { hidden: true } | ({ hidden: false } & T);

type Count = { count: number | undefined };

export type OrganisationOverview =
	| { status: "pending" | "error" }
	| {
			status: "ready";
			branches: Visible<Count>;
			departments: Visible<Count>;
			accessRoles: Visible<Count>;
			activity: Visible<{
				events: Array<AuditEvent> | undefined;
				failed: boolean;
			}>;
	  };

/** Retries what may pass next time (outages); a refusal or a bad request won't. */
export const retry = (failureCount: number, error: Error): boolean =>
	failureCount < 2 && !(error instanceof ApiProblemError && error.status < 500);

const visibleCount = (
	allowed: boolean,
	query: UseQueryResult<number>
): Visible<Count> =>
	allowed ? { hidden: false, count: query.data } : { hidden: true };

/**
 * The Organisation Overview's figures for one company. Each figure is fetched
 * only when the workspace grants its read permission at company scope, so a
 * person never sees a card that could only ever answer 403.
 */
export const useOrganisationOverview = (
	companyId: string
): OrganisationOverview => {
	const workspace = useQuery({ ...workspaceQuery, retry });
	const permissions = workspace.data
		? companyPermissions(workspace.data, companyId)
		: new Set<string>();
	const canReadBranches = permissions.has("branch:read");
	const canReadDepartments = permissions.has("department:read");
	const canReadAccessRoles = permissions.has("access_role:read");
	const canReadActivity = permissions.has("audit_event:read");

	const branches = useQuery({
		queryKey: ["organisation", companyId, "active-branch-count"],
		retry,
		queryFn: canReadBranches
			? (): Promise<number> => fetchActiveBranchCount(companyId)
			: skipToken,
	});
	const departments = useQuery({
		queryKey: ["organisation", companyId, "active-department-count"],
		retry,
		queryFn: canReadDepartments
			? (): Promise<number> => fetchActiveDepartmentCount(companyId)
			: skipToken,
	});
	const accessRoles = useQuery({
		queryKey: ["organisation", companyId, "access-role-count"],
		retry,
		queryFn: canReadAccessRoles
			? (): Promise<number> => fetchAccessRoleCount(companyId)
			: skipToken,
	});
	const activity = useQuery({
		queryKey: ["organisation", companyId, "recent-activity"],
		retry,
		queryFn: canReadActivity
			? (): Promise<Array<AuditEvent>> =>
					fetchRecentActivity(companyId, RECENT_ACTIVITY_SIZE)
			: skipToken,
	});

	if (workspace.isPending) return { status: "pending" };
	if (workspace.isError) return { status: "error" };
	return {
		status: "ready",
		branches: visibleCount(canReadBranches, branches),
		departments: visibleCount(canReadDepartments, departments),
		accessRoles: visibleCount(canReadAccessRoles, accessRoles),
		activity: canReadActivity
			? { hidden: false, events: activity.data, failed: activity.isError }
			: { hidden: true },
	};
};
