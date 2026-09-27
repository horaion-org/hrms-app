import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
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
import { createOnboarding } from "@/features/auth/api";
import { showFailure } from "@/features/auth/errors";
import { signUpSchema, type SignUpValues } from "@/features/auth/schemas";

/**
 * Creates a Company with the person signing up as its Owner. It goes through
 * the API rather than Cognito, which creates the Company, User and Owner role
 * in one transaction; Cognito then emails the confirmation code.
 */
export const SignUpPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const schema = useMemo(() => signUpSchema(t), [t]);
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<SignUpValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			companyName: "",
			subdomain: "",
			displayName: "",
			email: "",
			password: "",
		},
	});

	const onSubmit = handleSubmit(async (values): Promise<void> => {
		try {
			await createOnboarding(values);
			await navigate({ to: "/confirm-email", search: { email: values.email } });
		} catch (cause) {
			showFailure(cause, setError, {
				fields: [
					"companyName",
					"subdomain",
					"displayName",
					"email",
					"password",
				],
				fallbackField: "password",
				fallbackMessage: t("auth.fallbackError"),
				errorCodeFields: {
					SUBDOMAIN_ALREADY_TAKEN: "subdomain",
					EMAIL_ALREADY_REGISTERED: "email",
					PASSWORD_POLICY_VIOLATION: "password",
					IDENTITY_REJECTED: "email",
				},
			});
		}
	});

	// A workspace address is lower-case; typing is folded rather than refused.
	const subdomainField = register("subdomain");

	return (
		<AuthLayout
			description={t("auth.signUp.subtitle")}
			title={t("auth.signUp.title")}
		>
			<form noValidate className="space-y-4" onSubmit={onSubmit}>
				<FormField
					error={errors.companyName?.message}
					label={t("auth.signUp.companyName")}
				>
					{(control) => (
						<Input
							{...control}
							{...register("companyName")}
							autoComplete="organization"
							maxLength={255}
						/>
					)}
				</FormField>
				<FormField
					error={errors.subdomain?.message}
					hint={t("auth.signUp.subdomainHint")}
					label={t("auth.signUp.subdomain")}
				>
					{(control) => (
						<Input
							{...control}
							{...subdomainField}
							autoCapitalize="none"
							autoComplete="off"
							maxLength={30}
							spellCheck={false}
							onChange={(event) => {
								event.target.value = event.target.value.toLowerCase();
								void subdomainField.onChange(event);
							}}
						/>
					)}
				</FormField>
				<FormField
					error={errors.displayName?.message}
					label={t("auth.signUp.displayName")}
				>
					{(control) => (
						<Input
							{...control}
							{...register("displayName")}
							autoComplete="name"
							maxLength={255}
						/>
					)}
				</FormField>
				<FormField error={errors.email?.message} label={t("auth.signUp.email")}>
					{(control) => (
						<Input
							{...control}
							{...register("email")}
							autoComplete="email"
							type="email"
						/>
					)}
				</FormField>
				<FormField
					error={errors.password?.message}
					hint={t("auth.signUp.passwordHint")}
					label={t("auth.signUp.password")}
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
					{t("auth.signUp.submit")}
				</Button>
			</form>
			<p className="mt-6 text-center text-sm">
				<Link to="/sign-in">{t("auth.signUp.haveAccount")}</Link>
			</p>
		</AuthLayout>
	);
};
