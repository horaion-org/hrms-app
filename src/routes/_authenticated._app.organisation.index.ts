import { createFileRoute } from "@tanstack/react-router";
import { Organisation } from "@/pages/Organisation";
export const Route = createFileRoute("/_authenticated/_app/organisation/")({
	component: Organisation,
});
