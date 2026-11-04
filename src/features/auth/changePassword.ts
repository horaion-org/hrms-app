import type { ParseKeys, TFunction } from "i18next";
import { z } from "zod";
import { apiRequestVoid } from "@/common/api-client";
import { ApiProblemError } from "@/common/problem";
import { meetsPasswordPolicy } from "@/features/auth/passwordRules";

export type ChangePasswordValues = {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
};

/** Client-side checks only; the API and Cognito stay authoritative. */
export function changePasswordSchema(
	t: TFunction
): z.ZodType<ChangePasswordValues, ChangePasswordValues> {
	return z
		.object({
			currentPassword: z.string(),
			newPassword: z.string(),
			confirmPassword: z.string(),
		})
		.superRefine((values, context) => {
			if (!values.currentPassword)
				context.addIssue({
					code: "custom",
					path: ["currentPassword"],
					message: t("auth.changePassword.currentRequired"),
				});
			if (!meetsPasswordPolicy(values.newPassword))
				context.addIssue({
					code: "custom",
					path: ["newPassword"],
					message: t("auth.changePassword.passwordPolicy"),
				});
			else if (values.newPassword === values.currentPassword)
				context.addIssue({
					code: "custom",
					path: ["newPassword"],
					message: t("auth.changePassword.unchanged"),
				});
			if (values.confirmPassword !== values.newPassword)
				context.addIssue({
					code: "custom",
					path: ["confirmPassword"],
					message: t("auth.changePassword.passwordMismatch"),
				});
		});
}

/** Replaces the caller's password; the API then signs them out on every device. */
export const changePassword = (
	currentPassword: string,
	newPassword: string
): Promise<void> =>
	apiRequestVoid("/api/v1/me/password", {
		method: "PUT",
		body: { currentPassword, newPassword },
	});

export type ChangePasswordRefusal = {
	field: keyof ChangePasswordValues;
	messageKey: ParseKeys;
};

const fieldOfValidationError: Partial<Record<string, ChangePasswordRefusal>> = {
	currentPassword: {
		field: "currentPassword",
		messageKey: "auth.changePassword.currentRequired",
	},
	newPassword: {
		field: "newPassword",
		messageKey: "auth.changePassword.passwordPolicy",
	},
};

/** The field an API refusal belongs to, or `null` when it is for the form as a whole. */
export function changePasswordRefusal(
	cause: unknown
): ChangePasswordRefusal | null {
	if (!(cause instanceof ApiProblemError) || cause.status !== 400) return null;
	switch (cause.reason) {
		case "invalid-credentials":
			return {
				field: "currentPassword",
				messageKey: "auth.changePassword.invalidCurrent",
			};
		case "password-policy-violation":
			return {
				field: "newPassword",
				messageKey: "auth.changePassword.passwordPolicy",
			};
		case "password-unchanged":
			return {
				field: "newPassword",
				messageKey: "auth.changePassword.unchanged",
			};
		default: {
			const [first] = cause.fieldErrors;
			return first ? (fieldOfValidationError[first.field] ?? null) : null;
		}
	}
}
