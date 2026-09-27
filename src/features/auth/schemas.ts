import type { TFunction } from "i18next";
import { z } from "zod";

/*
 * Mirrors the API's CreateOnboardingRequest and SubdomainValidator, and the
 * Cognito user pool's default password policy, so a person sees what is wrong
 * before the request is sent. The API and Cognito still decide.
 */

const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
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

const required = (t: TFunction): z.ZodString =>
	z.string().trim().min(1, t("auth.validation.required"));

const email = (t: TFunction): z.ZodType<string, string> =>
	required(t)
		.max(320, t("auth.validation.tooLong", { max: 320 }))
		.pipe(z.email(t("auth.validation.email")));

/** A password the pool will accept: 8–128 characters from all four classes. */
export const newPasswordSchema = (t: TFunction): z.ZodString =>
	z
		.string()
		.min(8, t("auth.validation.passwordLength"))
		.max(128, t("auth.validation.passwordLength"))
		.refine(
			(value) =>
				/[a-z]/.test(value) &&
				/[A-Z]/.test(value) &&
				/\d/.test(value) &&
				/[^a-zA-Z0-9\s]/.test(value),
			t("auth.validation.passwordPolicy")
		);

/** A form schema whose parsed and raw values share one shape. */
type FormSchema<TValues> = z.ZodType<TValues, TValues>;

export type SignInValues = {
	email: string;
	password: string;
	remember: boolean;
};

export const signInSchema = (t: TFunction): FormSchema<SignInValues> =>
	z.object({
		email: email(t),
		password: z.string().min(1, t("auth.validation.required")),
		remember: z.boolean(),
	});

export type SignUpValues = {
	companyName: string;
	subdomain: string;
	displayName: string;
	email: string;
	password: string;
};

export const signUpSchema = (t: TFunction): FormSchema<SignUpValues> =>
	z.object({
		companyName: required(t).max(
			255,
			t("auth.validation.tooLong", { max: 255 })
		),
		subdomain: required(t)
			.regex(SUBDOMAIN_PATTERN, t("auth.validation.subdomainPattern"))
			.refine(
				(value) => !RESERVED_SUBDOMAINS.has(value),
				t("auth.validation.subdomainReserved")
			),
		displayName: required(t).max(
			255,
			t("auth.validation.tooLong", { max: 255 })
		),
		email: email(t),
		password: newPasswordSchema(t),
	});

export type ConfirmEmailValues = { code: string };

export const confirmEmailSchema = (
	t: TFunction
): FormSchema<ConfirmEmailValues> => z.object({ code: required(t) });

export type ForgotPasswordRequestValues = { email: string };

export const forgotPasswordRequestSchema = (
	t: TFunction
): FormSchema<ForgotPasswordRequestValues> => z.object({ email: email(t) });

export type ForgotPasswordResetValues = { code: string; password: string };

export const forgotPasswordResetSchema = (
	t: TFunction
): FormSchema<ForgotPasswordResetValues> =>
	z.object({ code: required(t), password: newPasswordSchema(t) });

export type NewPasswordValues = { password: string };

export const newPasswordFormSchema = (
	t: TFunction
): FormSchema<NewPasswordValues> =>
	z.object({ password: newPasswordSchema(t) });
