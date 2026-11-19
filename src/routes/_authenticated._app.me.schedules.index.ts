import { createFileRoute } from "@tanstack/react-router";
import { mondayOf } from "@/common/weeks";
import { myRosterDaysQuery } from "@/features/scheduling/myRoster/api";
import {
	parseMyRosterDaysSearch,
	windowFrom,
} from "@/features/scheduling/myRoster/myRosterDays";
import { MyRosterDaysPage, MyRosterDaysProblem } from "@/pages/MyRosterDays";

/**
 * The person's own days from published rosters, two weeks at a time
 * (`/me/schedules?from=…`). Offered in the menu to every member; needs no
 * scheduling permission.
 */
export const Route = createFileRoute("/_authenticated/_app/me/schedules/")({
	// The first Monday shown, so a reload or a link keeps it.
	validateSearch: parseMyRosterDaysSearch,
	loaderDeps: ({ search }) => ({ from: search.from }),
	// Warms the days; a failure stays in the cache for the page to explain.
	loader: async ({ context, deps }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		const shown = windowFrom(deps.from ?? mondayOf(new Date()));
		await context.queryClient.prefetchQuery(
			myRosterDaysQuery(companyId, shown.start, shown.end)
		);
	},
	component: MyRosterDaysPage,
	errorComponent: MyRosterDaysProblem,
});
