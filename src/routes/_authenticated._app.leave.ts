import { createFileRoute } from "@tanstack/react-router";
import {
	leaveUnitRulesOf,
	parseLeaveSearch,
} from "@/features/leave/leaveSearch";
import { workspaceQuery } from "@/features/workspace/api";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { Leave } from "@/pages/Leave";

export const Route = createFileRoute("/_authenticated/_app/leave")({
	validateSearch: parseLeaveSearch,
	// The header shows the Branch the team views list; My leave has none.
	staticData: {
		branchScope: {
			keys: LEAVE_READ_KEYS,
			rulesFor: (search) => leaveUnitRulesOf(parseLeaveSearch(search).view),
		},
	},
	// The selector's Branches come from the workspace; a failure stays in the cache for the page to explain.
	loader: async ({ context }) => {
		await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
	},
	component: Leave,
});
