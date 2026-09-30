import type { TFunction } from "i18next";
import { z } from "zod";

const email = (t: TFunction): z.ZodType<string, string> =>
	z
		.string()
		.trim()
		.min(1, t("auth.validation.required"))
		.max(320, t("auth.validation.tooLong", { max: 320 }))
		.pipe(z.email(t("auth.validation.email")));

export const logInSchema = (
	t: TFunction
): z.ZodObject<{ email: z.ZodType<string, string>; password: z.ZodString }> =>
	z.object({
		email: email(t),
		password: z
			.string()
			.min(1, t("auth.validation.required"))
			.max(256, t("auth.validation.tooLong", { max: 256 })),
	});
export type LogInValues = z.infer<ReturnType<typeof logInSchema>>;

export const sessionTokensSchema = z.object({
	accessToken: z.string().min(1),
	expiresIn: z.number().positive().finite(),
	challenge: z.never().optional(),
});
export const logInOutcomeSchema = z.union([
	sessionTokensSchema.transform(({ accessToken, expiresIn }) => ({
		kind: "session" as const,
		accessToken,
		expiresIn,
	})),
	z
		.object({
			challenge: z.enum(["NEW_PASSWORD_REQUIRED", "SOFTWARE_TOKEN_MFA"]),
			accessToken: z.never().optional(),
			expiresIn: z.never().optional(),
		})
		.transform(({ challenge }) => ({ kind: "challenge" as const, challenge })),
]);
export type LogInOutcome = z.infer<typeof logInOutcomeSchema>;

export const emailConfirmationSchema = (
	t: TFunction
): z.ZodObject<{
	email: z.ZodType<string, string>;
	code: z.ZodString;
}> =>
	z.object({
		email: email(t),
		code: z.string().regex(/^\d{6}$/, t("auth.emailConfirmation.codeFormat")),
	});
export type EmailConfirmationValues = z.infer<
	ReturnType<typeof emailConfirmationSchema>
>;
