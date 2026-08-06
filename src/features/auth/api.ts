import { apiRequest } from "@/common/api-client";

export type OnboardingDraft = {
	email: string;
	password: string;
	company_name: string;
	subdomain: string;
	display_name: string;
};

/**
 * Creates the Company, its Owner User, and the Owner role assignment in one
 * transaction. Sign-up must go through the API rather than Cognito directly,
 * or the identity would exist with no Company behind it.
 */
export async function createOnboarding(
	draft: OnboardingDraft
): Promise<{ company_id: string }> {
	return apiRequest<{ company_id: string }>("/api/v1/public/onboardings", {
		method: "POST",
		body: draft,
		anonymous: true,
	});
}
