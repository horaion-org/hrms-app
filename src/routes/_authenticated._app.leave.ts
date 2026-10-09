import { createFileRoute } from "@tanstack/react-router";
import { parseLeaveSearch } from "@/features/leave/leaveSearch";
import { workspaceQuery } from "@/features/workspace/api";
import { Leave } from "@/pages/Leave";

export const Route = createFileRoute("/_authenticated/_app/leave")({
	validateSearch: parseLeaveSearch,
	// The selector's Branches come from the workspace; a failure stays in the cache for the page to explain.
	loader: async ({ context }) => {
		await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
	},
	component: Leave,
});
