import { createFileRoute } from "@tanstack/react-router";
import { Scheduling } from "@/pages/ComingSoon";
export const Route = createFileRoute("/_authenticated/_app/scheduling")({
	component: Scheduling,
});
