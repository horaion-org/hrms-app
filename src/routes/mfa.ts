import { createFileRoute } from "@tanstack/react-router";
import { MfaChallengePage } from "@/features/auth/pages/MfaChallengePage";

export const Route = createFileRoute("/mfa")({
	component: MfaChallengePage,
});
