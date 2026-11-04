import { createFileRoute } from "@tanstack/react-router";
import { Forbidden } from "@/pages/Forbidden";

export const Route = createFileRoute("/_authenticated/_app/forbidden")({
	component: Forbidden,
});
