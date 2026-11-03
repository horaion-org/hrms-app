import { createFileRoute } from "@tanstack/react-router";
import { parseAvailabilitySearch } from "@/features/availability/availabilitySearch";
import { myProfileQuery } from "@/features/people/api";
import { workspaceQuery } from "@/features/workspace/api";
import { Availability } from "@/pages/Availability";

export const Route = createFileRoute("/_authenticated/_app/availability")({
	validateSearch: parseAvailabilitySearch,
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
