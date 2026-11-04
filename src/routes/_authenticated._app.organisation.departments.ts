import { createFileRoute } from "@tanstack/react-router";
import { workspaceQuery } from "@/features/workspace/api";
import { parseUnitSearch } from "@/features/workspace/unitSearch";
import { Departments } from "@/pages/Departments";

export const Route = createFileRoute(
	"/_authenticated/_app/organisation/departments"
)({
	validateSearch: parseUnitSearch,
	// The Branch choices come from the workspace; a failure stays in the cache for the page to explain.
	loader: async ({ context }) => {
		await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
	},
	component: Departments,
});
