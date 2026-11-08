import { createFileRoute } from "@tanstack/react-router";
import { parseOfferSearch } from "@/features/scheduling/coverOffers/offerSearch";
import { parseRosterSearch } from "@/features/scheduling/roster/rosterSearch";
import { myRosterQuery } from "@/features/scheduling/myRoster/api";
import { MyRosterPage, MyRosterProblem } from "@/pages/MyRoster";

/**
 * A published roster the person is on, named by the schedule's id. Reached
 * from a shift-assignment notification; needs no scheduling permission.
 */
export const Route = createFileRoute(
	"/_authenticated/_app/me/schedules/$scheduleId"
)({
	// The week and the side panel shown, and the offer a link opened, so a reload or a link keeps them.
	validateSearch: (search: Record<string, unknown>) => ({
		...parseRosterSearch(search),
		...parseOfferSearch(search),
	}),
	// Warms the roster; a failure stays in the cache for the page to explain.
	loader: async ({ context, params }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		await context.queryClient.prefetchQuery(
			myRosterQuery(companyId, params.scheduleId)
		);
	},
	component: MyRosterPage,
	errorComponent: MyRosterProblem,
});
