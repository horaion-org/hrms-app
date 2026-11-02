import { createFileRoute } from "@tanstack/react-router";
import { parseRosterSearch } from "@/features/scheduling/roster/rosterSearch";
import { scheduleQuery } from "@/features/scheduling/schedules/api";
import { workspaceQuery } from "@/features/workspace/api";
import {
	accessIndexOf,
	canAt,
	departmentScope,
} from "@/features/workspace/scopes";
import { ScheduleDetailPage } from "@/pages/ScheduleDetail";

/** A schedule's roster, read at the Department its URL names beside it. */
export const Route = createFileRoute(
	"/_authenticated/_app/scheduling_/$scheduleId"
)({
	validateSearch: parseRosterSearch,
	loaderDeps: ({ search }) => search,
	// Warms what the page reads first; a failure stays in the cache for the page to explain.
	loader: async ({ context, params, deps }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const workspace = await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
		const index = accessIndexOf(workspace, companyId);
		// Nothing is asked for where the workspace does not grant the read.
		if (canAt(index, "schedule:read", departmentScope(deps.departmentId)))
			await context.queryClient.prefetchQuery(
				scheduleQuery(companyId, deps, params.scheduleId)
			);
	},
	component: ScheduleDetailPage,
});
