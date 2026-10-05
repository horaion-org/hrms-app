import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { ApiProblemError } from "@/common/problem";
import { workspaceQuery } from "@/features/workspace/api";

const FORBIDDEN = 403;
/** Handled by the Session wiring, which re-settles the current company. */
const MEMBERSHIP_REVOKED = "MEMBERSHIP_REVOKED";

/**
 * Reloads the workspace whenever the API refuses a request with a 403. The
 * workspace decides which controls are shown, so a refusal on something the
 * person was shown means their grants changed after it was loaded. Reloading
 * it makes the control they should no longer see disappear.
 *
 * A refusal of the workspace request itself is ignored, or it would ask for
 * itself in a loop. Returns a function that stops listening.
 */
export const refreshWorkspaceOnRefusal = (
	queryClient: QueryClient
): (() => void) => {
	const refresh = (error: unknown, refusedKey?: QueryKey): void => {
		if (!(error instanceof ApiProblemError) || error.status !== FORBIDDEN)
			return;
		if (error.errorCode === MEMBERSHIP_REVOKED) return;
		if (refusedKey?.[0] === workspaceQuery.queryKey[0]) return;
		void queryClient.invalidateQueries({ queryKey: workspaceQuery.queryKey });
	};
	const stopQueries = queryClient.getQueryCache().subscribe((event) => {
		if (event.type === "updated" && event.action.type === "error")
			refresh(event.action.error, event.query.queryKey as QueryKey);
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
