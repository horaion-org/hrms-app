import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/pages/MainLayout";
export const Route = createFileRoute("/_authenticated/_app")({
	component: MainLayout,
});
