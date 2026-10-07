import { createFileRoute } from "@tanstack/react-router";
import { activeBranchesQuery } from "@/features/leave/api";
import { parseLeaveSearch } from "@/features/leave/leaveSearch";
import { workspaceQuery } from "@/features/workspace/api";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { holdsAnywhere } from "@/features/workspace/scopes";
import { Leave } from "@/pages/Leave";

export const Route = createFileRoute("/_authenticated/_app/leave")({
	validateSearch: parseLeaveSearch,
	loader: async ({ context, cause }) => {
		// Once on the page, the page asks for each change itself: only it knows the chosen Branch.
		if (cause === "stay") return;
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		// A failure stays in the cache for the page to explain, rather than replacing it.
		const workspace = await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
		// The Branches decide the first list; nothing is asked for without the key held anywhere.
		if (workspace && holdsAnywhere(workspace, companyId, LEAVE_READ_KEYS))
			await context.queryClient.prefetchQuery(activeBranchesQuery(companyId));
	},
	component: Leave,
});
