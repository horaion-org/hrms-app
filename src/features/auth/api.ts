import {
	passwordRequirements,
	type RegistrationErrors,
	type RegistrationField,
} from "@/features/auth/validation";

export type Registration = {
	displayName: string;
	companyName: string;
	registrationNumber: string;
	subdomain: string;
	email: string;
	password: string;
};

type Problem = {
	errorCode?: string;
	errors?: Array<{ field?: string }>;
};

const weakPassword = `This password isn’t strong enough. ${passwordRequirements}`;

// The API's errorCode values for refusals tied to one input (ADR-0028).
const refusedByCode: Record<string, RegistrationErrors> = {
	PASSWORD_POLICY_VIOLATION: { password: weakPassword },
	EMAIL_ALREADY_REGISTERED: {
		email: "This email address is already registered. Log in instead.",
	},
	SUBDOMAIN_ALREADY_TAKEN: {
		subdomain: "This workspace name is already taken. Choose another one.",
	},
	IDENTITY_REJECTED: {
		email: "We couldn’t use this email address. Check it and try again.",
	},
};

// Request properties the API validates, mapped to the form input a person can change.
const refusedByField: Record<string, [RegistrationField, string]> = {
	companyName: ["companyName", "Check your company name and try again."],
	displayName: ["firstName", "Check your first and last name and try again."],
	subdomain: [
		"subdomain",
		"This workspace name isn’t available. It may be reserved, so choose another one.",
	],
	email: ["email", "Enter a valid email address, such as name@company.com."],
	password: ["password", weakPassword],
};

const readProblem = async (response: Response): Promise<Problem> => {
	try {
		return (await response.json()) as Problem;
	} catch {
		return {};
	}
};

const fieldErrorsOf = (problem: Problem): RegistrationErrors => {
	const byCode = problem.errorCode
		? refusedByCode[problem.errorCode]
		: undefined;
	if (byCode) return byCode;
	const errors: RegistrationErrors = {};
	for (const { field } of problem.errors ?? []) {
		const refused = field ? refusedByField[field] : undefined;
		if (refused) errors[refused[0]] = refused[1];
	}
	return errors;
};

export const registerCompany = async (
	registration: Registration
): Promise<RegistrationErrors> => {
	const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
	let response: Response;
	try {
		response = await fetch(`${base}/api/v1/public/onboardings`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				email: registration.email,
				password: registration.password,
				companyName: registration.companyName,
				subdomain: registration.subdomain,
				displayName: registration.displayName,
			}),
			signal: AbortSignal.timeout(20000),
		});
	} catch {
		throw new Error("We couldn’t reach Horaion. Please try again shortly.");
	}
	if (response.status === 201) return {};
	// Refusals the person can fix resolve, so the form can show each on its input.
	if (response.status === 400 || response.status === 409) {
		const fieldErrors = fieldErrorsOf(await readProblem(response));
		if (Object.keys(fieldErrors).length > 0) return fieldErrors;
	}
	if (response.status === 409)
		throw new Error(
			"That email or workspace name is already in use. Please check your details."
		);
	if (response.status === 429)
		throw new Error(
			"Too many attempts. Please wait a moment before trying again."
		);
	if (response.status === 400)
		throw new Error(
			"Please check your details. Your workspace name may be reserved, or your password may not meet the requirements."
		);
	throw new Error("We couldn’t create your account. Please try again shortly.");
};
