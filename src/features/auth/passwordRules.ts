/**
 * The Cognito user pool's password policy, mirrored so forms can give instant
 * feedback. Cognito stays authoritative: keep these rules aligned with the
 * pool, and expect the API to refuse what the pool refuses.
 */
export const passwordRuleIds = [
	"length",
	"uppercase",
	"lowercase",
	"number",
	"symbol",
] as const;

export type PasswordRuleId = (typeof passwordRuleIds)[number];

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

// Cognito's symbol set. A space counts only inside the password, never at either end.
const symbol = /[\^$*.[\]{}()?"!@#%&/\\,><':;|_~`=+\- ]/;

const ruleChecks: Record<PasswordRuleId, (password: string) => boolean> = {
	length: (password) =>
		password.length >= PASSWORD_MIN_LENGTH &&
		password.length <= PASSWORD_MAX_LENGTH,
	uppercase: (password) => /[A-Z]/.test(password),
	lowercase: (password) => /[a-z]/.test(password),
	number: (password) => /\d/.test(password),
	symbol: (password) => symbol.test(password.trim()),
};

/** The rules the password does not meet yet, in display order. */
export const unmetPasswordRules = (password: string): Array<PasswordRuleId> =>
	passwordRuleIds.filter((rule) => !ruleChecks[rule](password));

export const meetsPasswordPolicy = (password: string): boolean =>
	unmetPasswordRules(password).length === 0;
