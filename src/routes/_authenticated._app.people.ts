import { createFileRoute } from "@tanstack/react-router";
import { People } from "@/pages/ComingSoon";
export const Route = createFileRoute("/_authenticated/_app/people")({
	component: People,
});
