import { createFileRoute } from "@tanstack/react-router";
import { ExamplePage } from "@/features/example/ExamplePage";

export const Route = createFileRoute("/example")({
	component: ExamplePage,
});
