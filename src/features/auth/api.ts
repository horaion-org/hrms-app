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

/** Confirms the email of a sign-up with the code Cognito emailed. */
export async function confirmSignUp(
	email: string,
	code: string
): Promise<void> {
	await apiRequest<void>("/api/v1/public/sign-up-confirmations", {
		method: "POST",
		body: { email, code },
		anonymous: true,
	});
}

/** Asks for another confirmation code. Answers alike for unknown emails. */
export async function resendConfirmationCode(email: string): Promise<void> {
	await apiRequest<void>("/api/v1/public/sign-up-confirmation-codes", {
		method: "POST",
		body: { email },
		anonymous: true,
	});
}

/** Emails a password reset code. Answers alike for unknown emails. */
export async function requestPasswordReset(email: string): Promise<void> {
	await apiRequest<void>("/api/v1/public/password-resets", {
		method: "POST",
		body: { email },
		anonymous: true,
	});
}

/** Sets a new password with the emailed code, ending every Session. */
export async function confirmPasswordReset(
	email: string,
	code: string,
	password: string
): Promise<void> {
	await apiRequest<void>("/api/v1/public/password-resets/completions", {
		method: "POST",
		/* eslint-disable camelcase -- the API's JSON is snake_case */
		body: { email, code, new_password: password },
		/* eslint-enable camelcase */
		anonymous: true,
	});
}

/** A Company's lifecycle state, as the API's CompanyStatus enum. */
export type CompanyStatus =
	"PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "CLOSED";

/** Whether a Membership, or a User, may still act, as the API's enums. */
export type MembershipStatus = "ACTIVE" | "INACTIVE";

export type UserStatus = "ACTIVE" | "INACTIVE";

/** One Company the signed-in person belongs to. */
export type Membership = {
	membershipId: string;
	companyId: string;
	companyName: string;
	subdomain: string;
	companyStatus: CompanyStatus;
	status: MembershipStatus;
};

/** The signed-in person and every Company they belong to. */
export type CurrentUser = {
	userId: string;
	email: string;
	displayName: string;
	status: UserStatus;
	memberships: Array<Membership>;
};

type MeData = {
	user_id: string;
	email: string;
	display_name: string;
	status: UserStatus;
	memberships: Array<{
		membership_id: string;
		company_id: string;
		company_name: string;
		subdomain: string;
		company_status: CompanyStatus;
		status: MembershipStatus;
	}>;
};

/** Loads the signed-in person with their Memberships. */
export async function fetchCurrentUser(): Promise<CurrentUser> {
	const data = await apiRequest<MeData>("/api/v1/me");

	return {
		userId: data.user_id,
		email: data.email,
		displayName: data.display_name,
		status: data.status,
		memberships: data.memberships.map((membership) => ({
			membershipId: membership.membership_id,
			companyId: membership.company_id,
			companyName: membership.company_name,
			subdomain: membership.subdomain,
			companyStatus: membership.company_status,
			status: membership.status,
		})),
	};
}

const MFA = "/api/v1/me/mfa";

/** Whether the signed-in person's sign-in asks for an authenticator code. */
export type MfaStatus = { totpEnabled: boolean };

export async function getMfaStatus(): Promise<MfaStatus> {
	const data = await apiRequest<{ totp_enabled: boolean }>(MFA);

	return { totpEnabled: data.totp_enabled };
}

/** A new authenticator secret, as text and as an otpauth URI for a QR code. */
export type TotpSecret = { secret: string; otpauthUri: string };

/** Starts, or restarts, adding an authenticator app. MFA stays off until verified. */
export async function startTotpEnrollment(): Promise<TotpSecret> {
	const data = await apiRequest<{ secret: string; otpauth_uri: string }>(
		`${MFA}/totp`,
		{ method: "POST", body: {} }
	);

	return { secret: data.secret, otpauthUri: data.otpauth_uri };
}

/** Confirms the authenticator with its first code, which turns MFA on. */
export async function verifyTotpEnrollment(code: string): Promise<void> {
	await apiRequest<void>(`${MFA}/totp/verifications`, {
		method: "POST",
		body: { code },
	});
}

/** Turns MFA off. The API checks the password and a current code first. */
export async function turnOffTotp(
	password: string,
	code: string
): Promise<void> {
	await apiRequest<void>(`${MFA}/totp`, {
		method: "DELETE",
		body: { password, code },
	});
}
