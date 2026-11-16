import { createFileRoute } from "@tanstack/react-router";
import { myProfileQuery } from "@/features/people/api";
import {
	parseShiftPreferencesSearch,
	shiftPreferencesUnitRulesOf,
} from "@/features/shiftPreferences/shiftPreferencesSearch";
import { workspaceQuery } from "@/features/workspace/api";
import { SHIFT_PREFERENCE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { ShiftPreferences } from "@/pages/ShiftPreferences";

export const Route = createFileRoute("/_authenticated/_app/shift-preferences")({
	validateSearch: parseShiftPreferencesSearch,
	// The header shows the Branch the team tab lists; the person's own week has none.
	staticData: {
		branchScope: {
			keys: SHIFT_PREFERENCE_READ_KEYS,
			rulesFor: (search) =>
				shiftPreferencesUnitRulesOf(parseShiftPreferencesSearch(search).view),
		},
	},
	// The tabs come from the workspace (the read key) and the warning from the caller's profile
	// (part-time or not); a failure of either stays in the cache for the page to explain.
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
	component: ShiftPreferences,
});
