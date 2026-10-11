import type { QueryClient } from "@tanstack/react-query";
import { watchAccessChanges } from "@/features/workspace/queryAccess";
import { refreshWorkspaceOnRefusal } from "@/features/workspace/refreshWorkspaceOnRefusal";

/**
 * Wires the cache to the person's access: refusals reload the workspace,
 * and a workspace showing shrunk access withdraws the administrative data
 * fetched under the old grants. Returns a function that undoes both.
 */
export const connectAccess = (queryClient: QueryClient): (() => void) => {
	const stopRefusals = refreshWorkspaceOnRefusal(queryClient);
	const stopWatching = watchAccessChanges(queryClient);
	return (): void => {
		stopRefusals();
		stopWatching();
	};
};
