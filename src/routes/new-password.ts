import { createFileRoute } from "@tanstack/react-router";
import { NewPasswordPage } from "@/features/auth/pages/NewPasswordPage";

export const Route = createFileRoute("/new-password")({
	component: NewPasswordPage,
});
