import { createFileRoute } from "@tanstack/react-router";
import { ChangePassword } from "@/pages/ChangePassword";

export const Route = createFileRoute("/_authenticated/_app/me/password")({
	component: ChangePassword,
});
