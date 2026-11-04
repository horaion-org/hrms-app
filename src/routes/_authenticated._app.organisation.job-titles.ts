import { createFileRoute } from "@tanstack/react-router";
import { JOB_TITLES_UNIT_RULES } from "@/features/organisation/listUnitRules";
import { workspaceQuery } from "@/features/workspace/api";
import { JOB_TITLE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { parseUnitSearch } from "@/features/workspace/unitSearch";
import { JobTitles } from "@/pages/JobTitles";

export const Route = createFileRoute(
	"/_authenticated/_app/organisation/job-titles"
)({
	validateSearch: parseUnitSearch,
	// The header shows the Branch the Job titles are listed in.
	staticData: {
		branchScope: {
			keys: JOB_TITLE_READ_KEYS,
			rulesFor: () => JOB_TITLES_UNIT_RULES,
		},
	},
	// The unit choices come from the workspace; a failure stays in the cache for the page to explain.
	loader: async ({ context }) => {
		await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
	},
	component: JobTitles,
});
