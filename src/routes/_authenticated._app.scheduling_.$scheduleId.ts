import { createFileRoute } from "@tanstack/react-router";
import { parseRosterSearch } from "@/features/scheduling/roster/rosterSearch";
import { companyScheduleQuery } from "@/features/scheduling/schedules/api";
import { workspaceQuery } from "@/features/workspace/api";
import type { FixedBranchLoaderData } from "@/features/workspace/branchScope";
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
	// The week and the side panel shown, so a reload or a link keeps them.
	validateSearch: parseRosterSearch,
	// Warms what the page reads first; a failure stays in the cache for the page to explain.
	// The schedule's Branch is named in the header: the page is about that one Branch.
	loader: async ({ context, params }): Promise<FixedBranchLoaderData> => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const workspace = await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
		// Nothing is asked for where the workspace grants the read nowhere.
		if (!canAnywhere(accessIndexOf(workspace, companyId), "schedule:read"))
			return {};
		const schedule = await context.queryClient
			.ensureQueryData(companyScheduleQuery(companyId, params.scheduleId))
			.catch(() => undefined);
		return schedule
			? {
					fixedBranch: {
						branchId: schedule.branchId,
						name: schedule.branchName,
					},
				}
			: {};
	},
	component: ScheduleDetailPage,
	errorComponent: ScheduleDetailProblem,
});
