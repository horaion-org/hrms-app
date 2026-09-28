import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/sign-in")({
	beforeLoad: () => redirect({ to: "/login" }),
});
