import { createFileRoute } from "@tanstack/react-router";
import { ConfirmEmailPage } from "@/features/auth/pages/ConfirmEmailPage";

export const Route = createFileRoute("/confirm-email")({
	component: ConfirmEmailPage,
});
