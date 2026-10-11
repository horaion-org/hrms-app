import { skipToken, useQuery } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import {
	fetchActivityPage,
	ORGANISATION_ENTITY_TYPES,
	type AuditEvent,
	type ListPage,
} from "@/features/organisation/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";
import { COMPANY_SCOPE } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** What the Dashboard's activity covers: the organisation, its people and their leave. */
export const DASHBOARD_ENTITY_TYPES = [
	...ORGANISATION_ENTITY_TYPES,
	"MemberProfile",
	"LeaveRequest",
] as const;

export type ActivityPage =
	| { status: "pending" | "error" | "hidden" }
	| ({ status: "ready" } & ListPage<AuditEvent>);

/**
 * One page of the company's activity, newest first. `hidden` when the
 * workspace does not grant `audit_event:read` at the company, or the API
 * refuses with a 403.
 */
export const useActivityPage = (
	companyId: string,
	page: number,
	size: number
): ActivityPage => {
	const access = useAccess();
	const allowed = access.can("audit_event:read", COMPANY_SCOPE);
	const query = useQuery({
		queryKey: ["dashboard", companyId, "activity", page, size],
		retry,
		meta: administrativeMeta(companyId),
		queryFn: allowed
			? ({ signal }): Promise<ListPage<AuditEvent>> =>
					fetchActivityPage(
						companyId,
						{ page, size, entityTypes: DASHBOARD_ENTITY_TYPES },
						signal
					)
			: skipToken,
	});
	if (access.status !== "ready") return { status: access.status };
	if (!allowed) return { status: "hidden" };
	if (query.error instanceof ApiProblemError && query.error.status === 403)
		return { status: "hidden" };
	if (query.isError) return { status: "error" };
	if (query.data === undefined) return { status: "pending" };
	return { status: "ready", ...query.data };
};
