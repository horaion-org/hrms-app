import { createFileRoute } from "@tanstack/react-router";
import { parseSettingsSearch } from "@/features/settings/sections";
import { Settings } from "@/pages/Settings";
export const Route = createFileRoute("/_authenticated/_app/settings")({
	validateSearch: parseSettingsSearch,
	component: Settings,
});
