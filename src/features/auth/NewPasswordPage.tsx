import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormField } from "@/components/forms/FormField";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import {
	completeNewPassword,
	hasPendingPasswordChallenge,
} from "@/features/auth/cognito";
import { showFailure } from "@/features/auth/errors";
import {
	newPasswordFormSchema,
	type NewPasswordValues,
} from "@/features/auth/schemas";

const NewPasswordForm = (): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const schema = useMemo(() => newPasswordFormSchema(t), [t]);
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<NewPasswordValues>({
		resolver: zodResolver(schema),
		defaultValues: { password: "" },
	});

	const onSubmit = handleSubmit(async (values): Promise<void> => {
		try {
			await completeNewPassword(values.password);
			await navigate({ to: "/" });
		} catch (cause) {
			showFailure(cause, setError, {
				fields: ["password"],
				fallbackField: "password",
				fallbackMessage: t("auth.fallbackError"),
			});
		}
	});

	return (
		<form noValidate className="space-y-4" onSubmit={onSubmit}>
			<FormField
				error={errors.password?.message}
				hint={t("auth.signUp.passwordHint")}
				label={t("auth.newPassword.password")}
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
				{t("auth.newPassword.submit")}
			</Button>
		</form>
	);
};

/**
 * Answers Cognito's NEW_PASSWORD_REQUIRED challenge, which a person created
 * with a temporary password meets on first sign-in. Reached without a pending
 * challenge (say, after a reload), it sends them back to sign in.
 */
export const NewPasswordPage = (): FunctionComponent => {
	const { t } = useTranslation();

	if (!hasPendingPasswordChallenge()) {
		return (
			<AuthLayout
				description={t("auth.newPassword.noChallengeSubtitle")}
				title={t("auth.newPassword.noChallengeTitle")}
			>
				<p className="text-center text-sm">
					<Link to="/sign-in">{t("auth.newPassword.back")}</Link>
				</p>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout
			description={t("auth.newPassword.subtitle")}
			title={t("auth.newPassword.title")}
		>
			<NewPasswordForm />
		</AuthLayout>
	);
};
