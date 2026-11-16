import { createFileRoute } from "@tanstack/react-router";
import { parseInsightsSearch } from "@/features/insights/insightsSearch";
import { INSIGHTS_UNIT_RULES } from "@/features/insights/insightsUnitRules";
import { workspaceQuery } from "@/features/workspace/api";
import { SCHEDULE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { Insights } from "@/pages/Insights";

export const Route = createFileRoute("/_authenticated/_app/insights")({
	validateSearch: parseInsightsSearch,
	// The header shows the Branch the tables read, offered where rosters may be read.
	staticData: {
		branchScope: {
			keys: SCHEDULE_READ_KEYS,
			rulesFor: () => INSIGHTS_UNIT_RULES,
		},
	},
	// The unit choices come from the workspace; a failure stays in the cache for the page to explain.
	loader: async ({ context }) => {
		await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
	},
	component: Insights,
});
