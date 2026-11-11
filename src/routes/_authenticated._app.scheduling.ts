import { createFileRoute } from "@tanstack/react-router";
import {
	parseSchedulingSearch,
	SCHEDULING_VIEW_KEYS,
} from "@/features/scheduling/schedulingSearch";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { workspaceQuery } from "@/features/workspace/api";
import { SCHEDULE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { Scheduling } from "@/pages/Scheduling";

export const Route = createFileRoute("/_authenticated/_app/scheduling")({
	validateSearch: parseSchedulingSearch,
	// The header shows the Branch the current tab lists in, offered by that tab's read keys.
	staticData: {
		branchScope: {
			keys: SCHEDULE_READ_KEYS,
			keysFor: (search) =>
				SCHEDULING_VIEW_KEYS[parseSchedulingSearch(search).view ?? "schedules"],
			rulesFor: () => SCHEDULING_UNIT_RULES,
		},
	},
	// The unit choices come from the workspace; a failure stays in the cache for the page to explain.
	loader: async ({ context }) => {
		await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
	},
	component: Scheduling,
});
