import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Checkbox } from "@/components/forms/Checkbox";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import { signIn } from "@/features/auth/cognito";
import { showFailure } from "@/features/auth/errors";
import { signInSchema, type SignInValues } from "@/features/auth/schemas";

export const SignInPage = (): FunctionComponent => {
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
		defaultValues: { email: "", password: "", remember: true },
	});

	const onSubmit = handleSubmit(async (values): Promise<void> => {
		try {
			const outcome = await signIn(
				values.email,
				values.password,
				values.remember
			);

			if (outcome.status === "NEW_PASSWORD_REQUIRED") {
				await navigate({ to: "/new-password" });

				return;
			}

			if (outcome.status === "UNCONFIRMED") {
				await navigate({
					to: "/confirm-email",
					search: { email: values.email },
				});

				return;
			}

			await navigate({ to: "/" });
		} catch (cause) {
			showFailure(cause, setError, {
				fields: ["email", "password"],
				fallbackField: "password",
				fallbackMessage: t("auth.fallbackError"),
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
				<div className="flex items-center justify-between gap-4">
					<Checkbox
						{...register("remember")}
						label={t("auth.signIn.remember")}
					/>
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
