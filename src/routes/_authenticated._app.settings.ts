import { createFileRoute, redirect } from "@tanstack/react-router";
import { SYSTEM_ROLES_PATH } from "@/features/organisation/systemRolesPath";
import { parseSettingsSearch } from "@/features/settings/sections";
import { Settings } from "@/pages/Settings";
export const Route = createFileRoute("/_authenticated/_app/settings")({
	validateSearch: parseSettingsSearch,
	// Access roles have their own page; the old `?section=access` address opens it.
	beforeLoad: ({ search }) => {
		if (search.section === "access")
			return redirect({ to: SYSTEM_ROLES_PATH, replace: true });
		return undefined;
	},
	component: Settings,
});
