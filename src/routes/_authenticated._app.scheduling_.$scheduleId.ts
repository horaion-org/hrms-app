import { createFileRoute } from "@tanstack/react-router";
import { companyScheduleQuery } from "@/features/scheduling/schedules/api";
import { workspaceQuery } from "@/features/workspace/api";
import { accessIndexOf, canAnywhere } from "@/features/workspace/scopes";
import {
	ScheduleDetailPage,
	ScheduleDetailProblem,
} from "@/pages/ScheduleDetail";

/**
 * A schedule's roster, named by its id alone; the schedule says which
 * Department it belongs to. Older links also carried `?branchId&departmentId`;
 * they still open, and the values are not used.
 */
export const Route = createFileRoute(
	"/_authenticated/_app/scheduling_/$scheduleId"
)({
	// Warms what the page reads first; a failure stays in the cache for the page to explain.
	loader: async ({ context, params }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const workspace = await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
		// Nothing is asked for where the workspace grants the read nowhere.
		if (canAnywhere(accessIndexOf(workspace, companyId), "schedule:read"))
			await context.queryClient.prefetchQuery(
				companyScheduleQuery(companyId, params.scheduleId)
			);
	},
	component: ScheduleDetailPage,
	errorComponent: ScheduleDetailProblem,
});
