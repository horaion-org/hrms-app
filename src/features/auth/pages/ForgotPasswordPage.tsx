import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import {
	confirmPasswordReset,
	requestPasswordReset,
} from "@/features/auth/api";
import { showFailure } from "@/features/auth/errors";
import {
	forgotPasswordRequestSchema,
	forgotPasswordResetSchema,
	type ForgotPasswordRequestValues,
	type ForgotPasswordResetValues,
} from "@/features/auth/schemas";
import { endSession } from "@/features/auth/session";
import { notifySuccess } from "@/store/useToastStore";

/**
 * Password recovery in two steps. First, where to send the reset code: the
 * API answers alike whether or not the email is registered, so the page moves
 * on the same way for both. Then the emailed code and the new password. A
 * completed reset ends every Session of the person, so this browser forgets
 * any access pass it holds (and tells its other tabs) before sending them to
 * sign in.
 */
export const ForgotPasswordPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [sentTo, setSentTo] = useState<string | undefined>();
	const requestSchema = useMemo(() => forgotPasswordRequestSchema(t), [t]);
	const resetSchema = useMemo(() => forgotPasswordResetSchema(t), [t]);
	const request = useForm<ForgotPasswordRequestValues>({
		resolver: zodResolver(requestSchema),
		defaultValues: { email: "" },
	});
	const reset = useForm<ForgotPasswordResetValues>({
		resolver: zodResolver(resetSchema),
		defaultValues: { code: "", password: "" },
	});

	const onRequest = request.handleSubmit(async (values): Promise<void> => {
		try {
			await requestPasswordReset(values.email);
			notifySuccess(t("auth.forgotPassword.sent"));
			setSentTo(values.email);
		} catch (cause) {
			showFailure(cause, request.setError, {
				fields: ["email"],
				fallbackField: "email",
				fallbackMessage: t("auth.fallbackError"),
				t,
			});
		}
	});

	const onReset = reset.handleSubmit(async (values): Promise<void> => {
		if (sentTo === undefined) {
			return;
		}

		try {
			await confirmPasswordReset(sentTo, values.code.trim(), values.password);
			endSession("signed-out");
			notifySuccess(t("auth.forgotPassword.changed"));
			await navigate({ to: "/sign-in", search: { email: sentTo } });
		} catch (cause) {
			showFailure(cause, reset.setError, {
				fields: ["code", "password"],
				fallbackField: "code",
				fallbackMessage: t("auth.fallbackError"),
				errorCodeFields: {
					INVALID_CODE: "code",
					PASSWORD_POLICY_VIOLATION: "password",
				},
				t,
			});
		}
	});

	const requestErrors = request.formState.errors;
	const resetErrors = reset.formState.errors;

	return (
		<AuthLayout
			title={t("auth.forgotPassword.title")}
			description={
				sentTo === undefined
					? t("auth.forgotPassword.requestSubtitle")
					: t("auth.forgotPassword.resetSubtitle")
			}
		>
			{sentTo === undefined ? (
				<form noValidate className="space-y-4" onSubmit={onRequest}>
					<FormField
						error={requestErrors.email?.message}
						label={t("auth.forgotPassword.email")}
					>
						{(control) => (
							<Input
								{...control}
								{...request.register("email")}
								autoComplete="email"
								type="email"
							/>
						)}
					</FormField>
					<Button
						className="w-full"
						loading={request.formState.isSubmitting}
						type="submit"
					>
						{t("auth.forgotPassword.request")}
					</Button>
				</form>
			) : (
				<form noValidate className="space-y-4" onSubmit={onReset}>
					<FormField label={t("auth.forgotPassword.email")}>
						{(control) => (
							<Input
								{...control}
								disabled
								readOnly
								type="email"
								value={sentTo}
							/>
						)}
					</FormField>
					<FormField
						error={resetErrors.code?.message}
						label={t("auth.forgotPassword.code")}
					>
						{(control) => (
							<Input
								{...control}
								{...reset.register("code")}
								autoComplete="one-time-code"
								inputMode="numeric"
							/>
						)}
					</FormField>
					<FormField
						error={resetErrors.password?.message}
						hint={t("auth.signUp.passwordHint")}
						label={t("auth.forgotPassword.password")}
					>
						{(control) => (
							<PasswordInput
								{...control}
								{...reset.register("password")}
								autoComplete="new-password"
								maxLength={128}
							/>
						)}
					</FormField>
					<Button
						className="w-full"
						loading={reset.formState.isSubmitting}
						type="submit"
					>
						{t("auth.forgotPassword.submit")}
					</Button>
				</form>
			)}
			<p className="mt-6 text-center text-sm">
				<Link to="/sign-in">{t("auth.forgotPassword.back")}</Link>
			</p>
		</AuthLayout>
	);
};
