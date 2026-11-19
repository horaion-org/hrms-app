import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import { mondayOf } from "@/common/weeks";
import { scheduleMonthQuery } from "@/features/scheduling/months/api";
import { parseTimelineSearch } from "@/features/scheduling/timeline/timelineSearch";
import { monthsOfWindow } from "@/features/scheduling/timeline/timelineRows";
import { workspaceQuery } from "@/features/workspace/api";
import type { FixedBranchLoaderData } from "@/features/workspace/branchScope";
import { accessIndexOf, canAnywhere } from "@/features/workspace/scopes";
import {
	DepartmentSchedulePage,
	DepartmentScheduleProblem,
} from "@/pages/DepartmentSchedule";

/**
 * One Department's schedules on one timeline,
 * `/scheduling/department?department=…&from=…&view=…&schedule=…`.
 */
export const Route = createFileRoute(
	"/_authenticated/_app/scheduling_/department"
)({
	validateSearch: parseTimelineSearch,
	loaderDeps: ({ search }) => ({
		department: search.department,
		from: search.from,
	}),
	// Warms the first month shown, as the month route does; a failure stays in the cache for the page to explain.
	// Its Branch is named in the header: the page is about that one Branch.
	loader: async ({ context, deps }): Promise<FixedBranchLoaderData> => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const workspace = await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
		if (
			!canAnywhere(accessIndexOf(workspace, companyId), "schedule:read") ||
			deps.department === undefined
		)
			return {};
		const firstDay = deps.from ?? mondayOf(dayjs().toDate());
		const [firstMonth] = monthsOfWindow(firstDay, firstDay);
		const month = await context.queryClient
			.ensureQueryData(
				scheduleMonthQuery(companyId, deps.department, firstMonth ?? "")
			)
			.catch(() => undefined);
		return month
			? { fixedBranch: { branchId: month.branchId, name: month.branchName } }
			: {};
	},
	component: DepartmentSchedulePage,
	errorComponent: DepartmentScheduleProblem,
});
