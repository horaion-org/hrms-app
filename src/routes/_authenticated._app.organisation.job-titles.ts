import { createFileRoute } from "@tanstack/react-router";
import { workspaceQuery } from "@/features/workspace/api";
import { parseUnitSearch } from "@/features/workspace/unitSearch";
import { JobTitles } from "@/pages/JobTitles";

export const Route = createFileRoute(
	"/_authenticated/_app/organisation/job-titles"
)({
	validateSearch: parseUnitSearch,
	// The unit choices come from the workspace; a failure stays in the cache for the page to explain.
	loader: async ({ context }) => {
		await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
	},
	component: JobTitles,
});
