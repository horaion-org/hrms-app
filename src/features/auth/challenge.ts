import type { TFunction } from "i18next";
import { z } from "zod";
import { returnPath } from "@/features/auth/returnPath";
import type { ChallengeKind } from "@/features/auth/session";

export function challengePath(kind: ChallengeKind): "/new-password" | "/mfa" {
	switch (kind) {
		case "NEW_PASSWORD_REQUIRED":
			return "/new-password";
		case "SOFTWARE_TOKEN_MFA":
			return "/mfa";
		default: {
			const exhaustive: never = kind;
			return exhaustive;
		}
	}
}

const searchSchema = z.object({
	redirect: z.string().optional().catch(undefined),
});
export function challengeSearch(search: unknown): { redirect?: string } {
	const parsed = searchSchema.parse(search);
	return parsed.redirect === undefined
		? {}
		: { redirect: returnPath(parsed.redirect) };
}

export type NewPasswordValues = {
	newPassword: string;
	confirmPassword: string;
};
export function newPasswordFormSchema(
	t: TFunction
): z.ZodType<NewPasswordValues, NewPasswordValues> {
	return z
		.object({
			newPassword: z
				.string()
				.min(8, t("auth.challenge.passwordPolicy"))
				.max(128, t("auth.challenge.passwordPolicy"))
				.refine(
					(value) =>
						/[a-z]/.test(value) &&
						/[A-Z]/.test(value) &&
						/\d/.test(value) &&
						/[^a-zA-Z0-9\s]/.test(value),
					t("auth.challenge.passwordPolicy")
				),
			confirmPassword: z.string(),
		})
		.refine((values) => values.newPassword === values.confirmPassword, {
			path: ["confirmPassword"],
			message: t("auth.challenge.passwordMismatch"),
		});
}

export type AuthenticatorCodeValues = { code: string };
export function authenticatorCodeSchema(
	t: TFunction
): z.ZodType<AuthenticatorCodeValues, AuthenticatorCodeValues> {
	return z.object({
		code: z.string().regex(/^\d{6}$/, t("auth.challenge.codeFormat")),
	});
}
