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
import { confirmForgotPassword, forgotPassword } from "@/features/auth/cognito";
import { showFailure } from "@/features/auth/errors";
import {
	forgotPasswordRequestSchema,
	forgotPasswordResetSchema,
	type ForgotPasswordRequestValues,
	type ForgotPasswordResetValues,
} from "@/features/auth/schemas";
import { notifySuccess } from "@/store/useToastStore";

type ResetFormProps = { email: string };

/** Second step: the emailed code and the new password. */
const ResetForm = ({ email }: ResetFormProps): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const schema = useMemo(() => forgotPasswordResetSchema(t), [t]);
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<ForgotPasswordResetValues>({
		resolver: zodResolver(schema),
		defaultValues: { code: "", password: "" },
	});

	const onSubmit = handleSubmit(async (values): Promise<void> => {
		try {
			await confirmForgotPassword(email, values.code.trim(), values.password);
			notifySuccess(t("auth.forgotPassword.changed"));
			await navigate({ to: "/sign-in" });
		} catch (cause) {
			showFailure(cause, setError, {
				fields: ["code", "password"],
				fallbackField: "code",
				fallbackMessage: t("auth.fallbackError"),
			});
		}
	});

	return (
		<form noValidate className="space-y-4" onSubmit={onSubmit}>
			<FormField label={t("auth.forgotPassword.email")}>
				{(control) => (
					<Input {...control} disabled readOnly type="email" value={email} />
				)}
			</FormField>
			<FormField
				error={errors.code?.message}
				label={t("auth.forgotPassword.code")}
			>
				{(control) => (
					<Input
						{...control}
						{...register("code")}
						autoComplete="one-time-code"
						inputMode="numeric"
					/>
				)}
			</FormField>
			<FormField
				error={errors.password?.message}
				hint={t("auth.signUp.passwordHint")}
				label={t("auth.forgotPassword.password")}
			>
				{(control) => (
					<PasswordInput
						{...control}
						{...register("password")}
						autoComplete="new-password"
						maxLength={128}
					/>
				)}
			</FormField>
			<Button className="w-full" loading={isSubmitting} type="submit">
				{t("auth.forgotPassword.submit")}
			</Button>
		</form>
	);
};

type RequestFormProps = { onSent: (email: string) => void };

/** First step: where to send the reset code. */
const RequestForm = ({ onSent }: RequestFormProps): FunctionComponent => {
	const { t } = useTranslation();
	const schema = useMemo(() => forgotPasswordRequestSchema(t), [t]);
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<ForgotPasswordRequestValues>({
		resolver: zodResolver(schema),
		defaultValues: { email: "" },
	});

	const onSubmit = handleSubmit(async (values): Promise<void> => {
		try {
			await forgotPassword(values.email);
			notifySuccess(t("auth.forgotPassword.sent"));
			onSent(values.email);
		} catch (cause) {
			showFailure(cause, setError, {
				fields: ["email"],
				fallbackField: "email",
				fallbackMessage: t("auth.fallbackError"),
			});
		}
	});

	return (
		<form noValidate className="space-y-4" onSubmit={onSubmit}>
			<FormField
				error={errors.email?.message}
				label={t("auth.forgotPassword.email")}
			>
				{(control) => (
					<Input
						{...control}
						{...register("email")}
						autoComplete="email"
						type="email"
					/>
				)}
			</FormField>
			<Button className="w-full" loading={isSubmitting} type="submit">
				{t("auth.forgotPassword.request")}
			</Button>
		</form>
	);
};

export const ForgotPasswordPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const [sentTo, setSentTo] = useState<string | undefined>();

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
				<RequestForm onSent={setSentTo} />
			) : (
				<ResetForm email={sentTo} />
			)}
			<p className="mt-6 text-center text-sm">
				<Link to="/sign-in">{t("auth.forgotPassword.back")}</Link>
			</p>
		</AuthLayout>
	);
};
