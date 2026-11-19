import { createFileRoute } from "@tanstack/react-router";
import { parseReportsSearch } from "@/features/reports/reportsSearch";
import { REPORTS_UNIT_RULES } from "@/features/reports/reportsUnitRules";
import { workspaceQuery } from "@/features/workspace/api";
import { REPORT_READ_KEYS } from "@/features/workspace/permissionKeys";
import { Reports } from "@/pages/Reports";

export const Route = createFileRoute("/_authenticated/_app/reports")({
	validateSearch: parseReportsSearch,
	// The header shows the Branch the tables read, offered where reports may be read.
	staticData: {
		branchScope: {
			keys: REPORT_READ_KEYS,
			rulesFor: () => REPORTS_UNIT_RULES,
		},
	},
	// The unit choices come from the workspace; a failure stays in the cache for the page to explain.
	loader: async ({ context }) => {
		await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
	},
	component: Reports,
});
