import { createFileRoute } from "@tanstack/react-router";
import { Notifications } from "@/pages/Notifications";

export const Route = createFileRoute("/_authenticated/_app/notifications")({
	component: Notifications,
});
