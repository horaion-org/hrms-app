import { createFileRoute, redirect } from "@tanstack/react-router";
import { challengeSearch } from "@/features/auth/challenge";
import { pendingChallenge } from "@/features/auth/session";
import { AuthenticatorCode } from "@/pages/AuthenticatorCode";

export const Route = createFileRoute("/mfa")({
	validateSearch: challengeSearch,
	beforeLoad: ({ search }) => {
		if (pendingChallenge() !== "SOFTWARE_TOKEN_MFA")
			return redirect({ to: "/login", search });
		return undefined;
	},
	component: AuthenticatorCode,
});
