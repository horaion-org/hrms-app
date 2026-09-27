import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormField } from "@/components/forms/FormField";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import { showFailure } from "@/features/auth/errors";
import { useChallengeScreen } from "@/features/auth/hooks/useChallengeScreen";
import { returnPath } from "@/features/auth/returnPath";
import {
	newPasswordFormSchema,
	type NewPasswordValues,
} from "@/features/auth/schemas";
import { answerChallenge } from "@/features/auth/session";

/**
 * Answers the new-password Challenge, which a person created with a temporary
 * password meets on first sign-in. Reached without a pending Challenge (say,
 * after a reload), it sends them back to sign in.
 */
export const NewPasswordPage = (): FunctionComponent => {
	const screen = useChallengeScreen("NEW_PASSWORD_REQUIRED");
	const search: { redirect?: unknown } = useSearch({ strict: false });
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
			const outcome = await answerChallenge({ newPassword: values.password });

			if (outcome.status === "SIGNED_IN") {
				await navigate({ href: returnPath(search.redirect) });

				return;
			}

			// The person also has MFA on: the code comes next.
			await navigate({
				to: "/mfa",
				search:
					search.redirect === undefined ? {} : { redirect: search.redirect },
			});
		} catch (cause) {
			showFailure(cause, setError, {
				fields: ["password"],
				fallbackField: "password",
				fallbackMessage: t("auth.fallbackError"),
				t,
			});
		}
	});

	return (
		<AuthLayout description={screen.description} title={screen.title}>
			<div className="space-y-4">
				{screen.pending && (
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
				)}
				<p className="text-center text-sm">
					<Link to="/sign-in">{screen.back}</Link>
				</p>
			</div>
		</AuthLayout>
	);
};
