import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { confirmSignUp, resendConfirmationCode } from "@/features/auth/api";
import { failureMessage, showFailure } from "@/features/auth/errors";
import {
	confirmEmailSchema,
	type ConfirmEmailValues,
} from "@/features/auth/schemas";
import { notifySuccess, useToastStore } from "@/store/useToastStore";

/**
 * Until the owner confirms, the API refuses to sign them in at all, so this
 * is a required step rather than a reminder. Confirming lands on sign-in with
 * the address filled in. Asking for another code answers alike whether or not
 * the address is registered, so the page cannot reveal who has an account.
 *
 * The address is prefilled from `?email=` (read without a `validateSearch`
 * schema: declaring one makes every route's search params strictly typed,
 * which the app does not do yet) and stays editable; without it the person
 * types it. Nothing is sent until it is a valid address.
 */
export const ConfirmEmailPage = (): FunctionComponent => {
	const search: { email?: unknown } = useSearch({ strict: false });
	const linkedEmail =
		typeof search.email === "string" ? search.email.trim() : "";
	const { t } = useTranslation();
	const navigate = useNavigate();
	const schema = useMemo(() => confirmEmailSchema(t), [t]);
	const [resending, setResending] = useState(false);
	const {
		register,
		handleSubmit,
		setError,
		trigger,
		getValues,
		formState: { errors, isSubmitting },
	} = useForm<ConfirmEmailValues>({
		resolver: zodResolver(schema),
		defaultValues: { email: linkedEmail, code: "" },
	});

	const onSubmit = handleSubmit(async (values): Promise<void> => {
		const email = values.email.trim();

		try {
			await confirmSignUp(email, values.code.trim());
			notifySuccess(t("auth.confirmEmail.confirmed"));
			await navigate({ to: "/sign-in", search: { email } });
		} catch (cause) {
			showFailure(cause, setError, {
				fields: ["email", "code"],
				fallbackField: "code",
				fallbackMessage: t("auth.fallbackError"),
				t,
			});
		}
	});

	const resend = async (): Promise<void> => {
		// A new code needs somewhere to go: never send an empty or invalid email.
		if (!(await trigger("email"))) {
			return;
		}

		setResending(true);

		try {
			await resendConfirmationCode(getValues("email").trim());
			notifySuccess(t("auth.confirmEmail.resent"));
		} catch (cause) {
			useToastStore
				.getState()
				.push("error", failureMessage(cause, t, t("auth.fallbackError")));
		} finally {
			setResending(false);
		}
	};

	return (
		<AuthLayout
			title={t("auth.confirmEmail.title")}
			description={
				linkedEmail === ""
					? t("auth.confirmEmail.subtitleNoEmail")
					: t("auth.confirmEmail.subtitle", { email: linkedEmail })
			}
		>
			<form noValidate className="space-y-4" onSubmit={onSubmit}>
				<FormField
					error={errors.email?.message}
					label={t("auth.confirmEmail.email")}
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
				<FormField
					error={errors.code?.message}
					label={t("auth.confirmEmail.code")}
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
				<Button className="w-full" loading={isSubmitting} type="submit">
					{t("auth.confirmEmail.submit")}
				</Button>
			</form>
			<div className="mt-6 text-center">
				<Button
					disabled={resending}
					variant="textlink"
					onClick={() => {
						void resend();
					}}
				>
					{t("auth.confirmEmail.resend")}
				</Button>
			</div>
		</AuthLayout>
	);
};
