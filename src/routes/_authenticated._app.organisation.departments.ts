import { createFileRoute } from "@tanstack/react-router";
import { DEPARTMENTS_UNIT_RULES } from "@/features/organisation/listUnitRules";
import { workspaceQuery } from "@/features/workspace/api";
import { DEPARTMENT_READ_KEYS } from "@/features/workspace/permissionKeys";
import { parseUnitSearch } from "@/features/workspace/unitSearch";
import { Departments } from "@/pages/Departments";

export const Route = createFileRoute(
	"/_authenticated/_app/organisation/departments"
)({
	validateSearch: parseUnitSearch,
	// The header shows the Branch the Departments are listed in.
	staticData: {
		branchScope: {
			keys: DEPARTMENT_READ_KEYS,
			rulesFor: () => DEPARTMENTS_UNIT_RULES,
		},
	},
	// The Branch choices come from the workspace; a failure stays in the cache for the page to explain.
	loader: async ({ context }) => {
		await context.queryClient
			.ensureQueryData(workspaceQuery)
			.catch(() => undefined);
	},
	component: Departments,
});
