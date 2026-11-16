import { createFileRoute } from "@tanstack/react-router";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { dashboardPreferencesQuery } from "@/features/dashboard/dashboardPreferences";
import { DASHBOARD_UNIT_RULES } from "@/features/dashboard/dashboardUnitRules";
import { Home } from "@/pages/Home";

export const Route = createFileRoute("/_authenticated/_app/")({
	// The header shows the Branch the dashboard's leave figures are for.
	staticData: {
		branchScope: {
			keys: LEAVE_READ_KEYS,
			rulesFor: () => DASHBOARD_UNIT_RULES,
		},
	},
	// The sections the member hides, so Home reads only those they keep; a failure shows every section.
	loader: async ({ context }) => {
		if (
			!("currentCompany" in context) ||
			context.currentCompany.kind !== "settled"
		)
			return;
		await context.queryClient
			.ensureQueryData(
				dashboardPreferencesQuery(context.currentCompany.company.companyId)
			)
			.catch(() => undefined);
	},
	component: Home,
});
