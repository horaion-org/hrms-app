import { createFileRoute } from "@tanstack/react-router";
import { scheduleMonthQuery } from "@/features/scheduling/months/api";
import {
	isMonth,
	parseMonthSearch,
} from "@/features/scheduling/months/monthSearch";
import { workspaceQuery } from "@/features/workspace/api";
import type { FixedBranchLoaderData } from "@/features/workspace/branchScope";
import { accessIndexOf, canAnywhere } from "@/features/workspace/scopes";
import { ScheduleMonthPage, ScheduleMonthProblem } from "@/pages/ScheduleMonth";

/**
 * One Department's schedules for a month, `/scheduling/months/2026-11?department=…`:
 * its weeks are the Mondays that fall in the month.
 */
export const Route = createFileRoute(
	"/_authenticated/_app/scheduling_/months/$month"
)({
	validateSearch: parseMonthSearch,
	loaderDeps: ({ search }) => ({ department: search.department }),
	// Warms what the page reads; a failure stays in the cache for the page to explain.
	// The month's Branch is named in the header: the page is about that one Branch.
	loader: async ({ context, params, deps }): Promise<FixedBranchLoaderData> => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const workspace = await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
		// Nothing is asked for where the workspace grants the read nowhere, or the URL names no month or Department.
		if (
			!canAnywhere(accessIndexOf(workspace, companyId), "schedule:read") ||
			!isMonth(params.month) ||
			deps.department === undefined
		)
			return {};
		const month = await context.queryClient
			.ensureQueryData(
				scheduleMonthQuery(companyId, deps.department, params.month)
			)
			.catch(() => undefined);
		return month
			? { fixedBranch: { branchId: month.branchId, name: month.branchName } }
			: {};
	},
	component: ScheduleMonthPage,
	errorComponent: ScheduleMonthProblem,
});
