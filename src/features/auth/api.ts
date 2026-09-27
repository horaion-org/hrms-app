import { apiRequest } from "@/common/api-client";

export type OnboardingDraft = {
	email: string;
	password: string;
	companyName: string;
	subdomain: string;
	displayName: string;
};

export type Onboarding = { companyId: string };

/**
 * Creates the Company, its Owner User, and the Owner role assignment in one
 * transaction. Sign-up must go through the API rather than Cognito directly,
 * or the identity would exist with no Company behind it. The API reads and
 * writes snake_case JSON; this module owns that translation.
 */
export async function createOnboarding(
	draft: OnboardingDraft
): Promise<Onboarding> {
	const data = await apiRequest<{ company_id: string }>(
		"/api/v1/public/onboardings",
		{
			method: "POST",
			/* eslint-disable camelcase -- the API's JSON is snake_case */
			body: {
				email: draft.email,
				password: draft.password,
				company_name: draft.companyName,
				subdomain: draft.subdomain,
				display_name: draft.displayName,
			},
			/* eslint-enable camelcase */
			anonymous: true,
		}
	);

	return { companyId: data.company_id };
}
