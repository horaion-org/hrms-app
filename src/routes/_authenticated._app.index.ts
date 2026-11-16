import { createFileRoute } from "@tanstack/react-router";
import { LEAVE_READ_KEYS } from "@/features/workspace/permissionKeys";
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
	component: Home,
});
