import type { Query, QueryClient } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import { BUSINESS_RULE_REFUSALS } from "@/features/organisation/refusal";
import { workspaceQuery } from "@/features/workspace/api";

const FORBIDDEN = 403;
const NOT_FOUND = 404;

/**
 * 403 codes that are not about changed grants, so reloading the workspace
 * cannot help: `MEMBERSHIP_REVOKED` is handled by the Session wiring, which
 * re-settles the current company and clears its data, and business rules
 * such as `OWN_LEAVE_REVIEW_DENIED` hold whatever the person's roles.
 */
export const NOT_ACCESS_REFUSALS: ReadonlySet<string> = new Set([
	"MEMBERSHIP_REVOKED",
	...BUSINESS_RULE_REFUSALS,
]);

/**
 * Whether a failure suggests the person's grants changed since the
 * workspace was loaded: a 403 refusal other than the business rules above,
 * or a 404 from reading one administrative record, which the API returns
 * for a record moved out of reach as well as a missing one. A list's 404,
 * or any other 404, says nothing about grants and is left alone.
 */
const suggestsChangedAccess = (error: unknown, query?: Query): boolean => {
	if (!(error instanceof ApiProblemError)) return false;
	if (error.status === FORBIDDEN)
		return !NOT_ACCESS_REFUSALS.has(error.errorCode ?? "");
	return (
		error.status === NOT_FOUND &&
		query?.meta?.accessKind === "administrative" &&
		query.meta.record === true
	);
};

/**
 * Reloads the workspace when a refusal suggests the person's grants changed
 * (see `suggestsChangedAccess`). The workspace decides which controls are
 * shown, so a refusal on something the person was shown means it is out of
 * date; reloading it makes the control disappear, and the access-refresh
 * coordinator (`watchAccessChanges`) clears rows the person can no longer
 * read. This is advisory: it never retries the refused request.
 *
 * A failure of the workspace request itself is ignored, or it would ask for
 * itself in a loop. Returns a function that stops listening.
 */
export const refreshWorkspaceOnRefusal = (
	queryClient: QueryClient
): (() => void) => {
	const refresh = (error: unknown, query?: Query): void => {
		if (!suggestsChangedAccess(error, query)) return;
		if (query?.queryKey[0] === workspaceQuery.queryKey[0]) return;
		void queryClient.invalidateQueries({ queryKey: workspaceQuery.queryKey });
	};
	const stopQueries = queryClient.getQueryCache().subscribe((event) => {
		if (event.type === "updated" && event.action.type === "error")
			refresh(event.action.error, event.query);
	});
	const stopMutations = queryClient.getMutationCache().subscribe((event) => {
		if (event.type === "updated" && event.action.type === "error")
			refresh(event.action.error);
	});
	return (): void => {
		stopQueries();
		stopMutations();
	};
};
