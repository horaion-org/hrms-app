import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/pages/Home";
export const Route = createFileRoute("/_authenticated/_app/")({
	component: Home,
});
