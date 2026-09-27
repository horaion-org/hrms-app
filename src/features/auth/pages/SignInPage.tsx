import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import { ApiProblemError } from "@/common/problem";
import { showFailure } from "@/features/auth/errors";
import { returnPath } from "@/features/auth/returnPath";
import { signInSchema, type SignInValues } from "@/features/auth/schemas";
import { signIn } from "@/features/auth/session";

/**
 * Signs in through the API, which keeps the Session. `?redirect=` names the
 * page to return to and `?email=` prefills the address; both are read without
 * a `validateSearch` schema, as on the email confirmation page.
 */
export const SignInPage = (): FunctionComponent => {
	const search: { redirect?: unknown; email?: unknown } = useSearch({
		strict: false,
	});
	const { t } = useTranslation();
	const navigate = useNavigate();
	const schema = useMemo(() => signInSchema(t), [t]);
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<SignInValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			email: typeof search.email === "string" ? search.email : "",
			password: "",
		},
	});

	const onSubmit = handleSubmit(async (values): Promise<void> => {
		try {
			const outcome = await signIn(values.email, values.password);

			if (outcome.status === "SIGNED_IN") {
				await navigate({ href: returnPath(search.redirect) });

				return;
			}

			await navigate({
				to:
					outcome.challenge === "NEW_PASSWORD_REQUIRED"
						? "/new-password"
						: "/mfa",
				search:
					search.redirect === undefined ? {} : { redirect: search.redirect },
			});
		} catch (cause) {
			if (
				cause instanceof ApiProblemError &&
				cause.errorCode === "EMAIL_NOT_VERIFIED"
			) {
				await navigate({
					to: "/confirm-email",
					search: { email: values.email },
				});

				return;
			}

			showFailure(cause, setError, {
				fields: ["email", "password"],
				fallbackField: "password",
				fallbackMessage: t("auth.fallbackError"),
				t,
			});
		}
	});

	return (
		<AuthLayout
			description={t("auth.signIn.subtitle")}
			title={t("auth.signIn.title")}
		>
			<form noValidate className="space-y-4" onSubmit={onSubmit}>
				<FormField error={errors.email?.message} label={t("auth.signIn.email")}>
					{(control) => (
						<Input
							{...control}
							{...register("email")}
							autoComplete="email"
							placeholder={t("auth.signIn.emailPlaceholder")}
							type="email"
						/>
					)}
				</FormField>
				<FormField
					error={errors.password?.message}
					label={t("auth.signIn.password")}
				>
					{(control) => (
						<PasswordInput
							{...control}
							{...register("password")}
							autoComplete="current-password"
						/>
					)}
				</FormField>
				<div className="flex justify-end">
					<Link className="text-sm" to="/forgot-password" variant="muted">
						{t("auth.signIn.trouble")}
					</Link>
				</div>
				<Button className="w-full" loading={isSubmitting} type="submit">
					{t("auth.signIn.submit")}
				</Button>
			</form>
			<p className="mt-6 text-center text-sm text-neutral-700">
				{t("auth.signIn.noAccount")}{" "}
				<Link to="/sign-up">{t("auth.signIn.signUp")}</Link>
			</p>
		</AuthLayout>
	);
};
