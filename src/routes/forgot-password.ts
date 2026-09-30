import { createFileRoute } from "@tanstack/react-router";
import { PasswordReset } from "@/pages/PasswordReset";
export const Route = createFileRoute("/forgot-password")({
	component: PasswordReset,
});
