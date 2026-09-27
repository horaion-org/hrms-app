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
import { confirmSignUp, resendConfirmationCode } from "@/features/auth/cognito";
import { showFailure } from "@/features/auth/errors";
import {
	confirmEmailSchema,
	type ConfirmEmailValues,
} from "@/features/auth/schemas";
import { notifyError, notifySuccess } from "@/store/useToastStore";

/**
 * Until the owner confirms, Cognito refuses to authenticate them at all, so
 * this is a required step rather than a reminder. The address comes from
 * `?email=`, read without a `validateSearch` schema: declaring one makes every
 * route's search params strictly typed, which the app does not do yet.
 */
export const ConfirmEmailPage = (): FunctionComponent => {
	const search: { email?: unknown } = useSearch({ strict: false });
	const email = typeof search.email === "string" ? search.email : "";
	const { t } = useTranslation();
	const navigate = useNavigate();
	const schema = useMemo(() => confirmEmailSchema(t), [t]);
	const [resending, setResending] = useState(false);
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<ConfirmEmailValues>({
		resolver: zodResolver(schema),
		defaultValues: { code: "" },
	});

	const onSubmit = handleSubmit(async (values): Promise<void> => {
		try {
			await confirmSignUp(email, values.code.trim());
			notifySuccess(t("auth.confirmEmail.confirmed"));
			await navigate({ to: "/sign-in" });
		} catch (cause) {
			showFailure(cause, setError, {
				fields: ["code"],
				fallbackField: "code",
				fallbackMessage: t("auth.fallbackError"),
			});
		}
	});

	const resend = async (): Promise<void> => {
		setResending(true);

		try {
			await resendConfirmationCode(email);
			notifySuccess(t("auth.confirmEmail.resent"));
		} catch (cause) {
			notifyError(cause, t("auth.fallbackError"));
		} finally {
			setResending(false);
		}
	};

	return (
		<AuthLayout
			description={t("auth.confirmEmail.subtitle", { email })}
			title={t("auth.confirmEmail.title")}
		>
			<form noValidate className="space-y-4" onSubmit={onSubmit}>
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
