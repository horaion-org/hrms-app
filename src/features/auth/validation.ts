import {
	unmetPasswordRules,
	type PasswordRuleId,
} from "@/features/auth/passwordRules";

export const registrationFields = [
	"companyName",
	"registrationNumber",
	"firstName",
	"lastName",
	"subdomain",
	"email",
	"password",
	"confirmPassword",
] as const;

export type RegistrationField = (typeof registrationFields)[number];
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

// Keep this list aligned with the API's SubdomainValidator. The API remains authoritative.
const reservedWorkspaces = new Set([
	"api",
	"admin",
	"www",
	"auth",
	"mail",
	"status",
	"app",
	"dev",
	"staging",
	"docs",
	"support",
	"billing",
	"help",
	"root",
	"system",
	"security",
	"internal",
	"public",
	"horaion",
]);

export const passwordRequirements =
	"Use at least 8 characters, including an uppercase letter, a lowercase letter, a number and a symbol.";

const characterRuleLabels: Record<Exclude<PasswordRuleId, "length">, string> = {
	uppercase: "an uppercase letter",
	lowercase: "a lowercase letter",
	number: "a number",
	symbol: "a symbol",
};

const listOf = (items: Array<string>): string =>
	items.length > 1
		? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
		: items.join("");

export const validateRegistration = (data: FormData): RegistrationErrors => {
	const errors: RegistrationErrors = {};
	const value = (field: RegistrationField): string => {
		const entry = data.get(field);
		return typeof entry === "string" ? entry : "";
	};
	const textFields = [
		["companyName", "Company name", 255],
		["registrationNumber", "Registration number", 64],
		["firstName", "First name", 127],
		["lastName", "Last name", 127],
	] as const;
	for (const [field, label, max] of textFields) {
		const text = value(field).trim();
		if (!text) errors[field] = `${label} is required.`;
		else if (text.length > max)
			errors[field] = `${label} must be ${max} characters or fewer.`;
	}
	const workspace = value("subdomain").trim();
	if (!workspace) errors.subdomain = "Workspace name is required.";
	else if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(workspace)) {
		errors.subdomain =
			"Use 3–30 lowercase letters, numbers, or hyphens. Start and end with a letter or number.";
	} else if (reservedWorkspaces.has(workspace)) {
		errors.subdomain = "This workspace name is reserved. Choose another one.";
	}
	const email = value("email").trim();
	if (!email) errors.email = "Email address is required.";
	else if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		errors.email = "Enter a valid email address, such as name@company.com.";
	}
	const password = value("password");
	const unmet = unmetPasswordRules(password);
	if (!password.trim()) errors.password = "Password is required.";
	else if (unmet.includes("length"))
		errors.password = "Use between 8 and 128 characters.";
	else if (unmet.length > 0) {
		const missing = unmet.flatMap((rule) =>
			rule === "length" ? [] : [characterRuleLabels[rule]]
		);
		errors.password = `Add ${listOf(missing)}.`;
	}
	const confirmation = value("confirmPassword");
	if (!confirmation) errors.confirmPassword = "Please confirm your password.";
	else if (confirmation !== password)
		errors.confirmPassword =
			"Passwords don’t match. Enter the same password in both fields.";
	return errors;
};
