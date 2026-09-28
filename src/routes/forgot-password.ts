import { createFileRoute } from "@tanstack/react-router";
import { PasswordRecovery } from "@/features/auth/PasswordRecovery";
export const Route = createFileRoute("/forgot-password")({
	component: PasswordRecovery,
});
