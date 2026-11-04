import { createFileRoute } from "@tanstack/react-router";
import {
	availabilityUnitRulesOf,
	parseAvailabilitySearch,
} from "@/features/availability/availabilitySearch";
import { myProfileQuery } from "@/features/people/api";
import { workspaceQuery } from "@/features/workspace/api";
import { AVAILABILITY_READ_KEYS } from "@/features/workspace/permissionKeys";
import { Availability } from "@/pages/Availability";

export const Route = createFileRoute("/_authenticated/_app/availability")({
	validateSearch: parseAvailabilitySearch,
	// The header shows the Branch the team tab lists; the person's own week has none.
	staticData: {
		branchScope: {
			keys: AVAILABILITY_READ_KEYS,
			rulesFor: (search) =>
				availabilityUnitRulesOf(parseAvailabilitySearch(search).view),
		},
	},
	// The tabs come from the caller's profile (part-time or not) and the workspace (the read key);
	// a failure of either stays in the cache for the page to explain.
	loader: async ({ context }) => {
		const companyId =
			"currentCompany" in context && context.currentCompany.kind === "settled"
				? context.currentCompany.company.companyId
				: "";
		await Promise.all([
			context.queryClient
				.ensureQueryData(workspaceQuery)
				.catch(() => undefined),
			context.queryClient
				.ensureQueryData(myProfileQuery(companyId))
				.catch(() => undefined),
		]);
	},
	component: Availability,
});
