import { createFileRoute, redirect } from "@tanstack/react-router";
import { challengeSearch } from "@/features/auth/challenge";
import { pendingChallenge } from "@/features/auth/session";
import { NewPassword } from "@/pages/NewPassword";

export const Route = createFileRoute("/new-password")({
	validateSearch: challengeSearch,
	beforeLoad: ({ search }) => {
		if (pendingChallenge() !== "NEW_PASSWORD_REQUIRED")
			return redirect({ to: "/login", search });
		return undefined;
	},
	component: NewPassword,
});
