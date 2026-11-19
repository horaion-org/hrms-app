import { createFileRoute } from "@tanstack/react-router";
import { deletedScheduleQuery } from "@/features/scheduling/history/deletedSchedule";
import { parseRosterSearch } from "@/features/scheduling/roster/rosterSearch";
import { workspaceQuery } from "@/features/workspace/api";
import type { FixedBranchLoaderData } from "@/features/workspace/branchScope";
import { accessIndexOf, canAnywhere } from "@/features/workspace/scopes";
import {
	DeletedSchedulePage,
	DeletedScheduleProblem,
} from "@/pages/DeletedSchedule";

/**
 * A deleted schedule's record, named by its id alone and only read. The
 * roster page's own route answers "not found" for the same id.
 */
export const Route = createFileRoute(
	"/_authenticated/_app/scheduling_/history/$scheduleId"
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
			.ensureQueryData(deletedScheduleQuery(companyId, params.scheduleId))
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
	component: DeletedSchedulePage,
	errorComponent: DeletedScheduleProblem,
});
