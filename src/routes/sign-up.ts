import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/sign-up")({
	beforeLoad: () => redirect({ to: "/register" }),
});
