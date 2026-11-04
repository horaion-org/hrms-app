import { createFileRoute } from "@tanstack/react-router";
import { SCHEDULING_UNIT_RULES } from "@/features/scheduling/schedules/schedulesUnitRules";
import { SCHEDULE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { parseUnitSearch } from "@/features/workspace/unitSearch";
import { Scheduling } from "@/pages/Scheduling";

export const Route = createFileRoute("/_authenticated/_app/scheduling")({
	validateSearch: parseUnitSearch,
	// The header shows the Branch the schedules are listed in.
	staticData: {
		branchScope: {
			keys: SCHEDULE_READ_KEYS,
			rulesFor: () => SCHEDULING_UNIT_RULES,
		},
	},
	component: Scheduling,
});
