import { createFileRoute } from "@tanstack/react-router";
import { SecuritySettingsPage } from "@/features/auth/pages/SecuritySettingsPage";

export const Route = createFileRoute("/_authenticated/settings/security")({
	component: SecuritySettingsPage,
});
