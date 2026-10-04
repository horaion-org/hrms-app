import { createFileRoute } from "@tanstack/react-router";
import { Leave } from "@/pages/Leave";
export const Route = createFileRoute("/_authenticated/_app/leave")({
	component: Leave,
});
