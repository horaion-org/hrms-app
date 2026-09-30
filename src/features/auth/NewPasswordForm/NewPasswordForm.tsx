import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/features/auth/AuthField";
import { AuthMessage } from "@/features/auth/AuthMessage";
import {
	newPasswordFormSchema,
	type NewPasswordValues,
} from "@/features/auth/challenge";
import { useChallengeAnswer } from "@/features/auth/useChallengeAnswer";

export const NewPasswordForm = (): FunctionComponent => {
	const { t } = useTranslation();
	const schema = useMemo(() => newPasswordFormSchema(t), [t]);
	const {
		register,
		handleSubmit,
		setError,
		setFocus,
		formState: { errors, isSubmitting },
	} = useForm<NewPasswordValues>({
		resolver: zodResolver(schema),
		defaultValues: { newPassword: "", confirmPassword: "" },
	});
	const { answer, held, message, messageContainer } = useChallengeAnswer(
		(message) => {
			setError("newPassword", { type: "server", message });
		}
	);
	useEffect(() => {
		if (!isSubmitting && errors.newPassword?.type === "server")
			setFocus("newPassword");
	}, [isSubmitting, errors.newPassword, setFocus]);
	const submit = (values: NewPasswordValues): Promise<void> =>
		answer({ newPassword: values.newPassword });

	return (
		<>
			<div className="space-y-3">
				<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
					{t("auth.challenge.newPasswordTitle")}
				</h1>
				<p className="text-base leading-6 text-neutral-800">
					{t("auth.challenge.newPasswordSubtitle")}
				</p>
			</div>
			<form
				noValidate
				className="mt-9 space-y-8"
				onSubmit={handleSubmit(submit)}
			>
				<fieldset className="flex flex-col gap-4" disabled={isSubmitting}>
					<legend className="sr-only">
						{t("auth.challenge.newPasswordTitle")}
					</legend>
					<AuthField
						required
						autoComplete="new-password"
						error={errors.newPassword?.message}
						hint={t("auth.challenge.passwordPolicy")}
						id="new-password"
						label={t("auth.challenge.newPassword")}
						maxLength={128}
						type="password"
						toggleLabels={{
							show: t("auth.showPassword"),
							hide: t("auth.hidePassword"),
						}}
						{...register("newPassword")}
					/>
					<AuthField
						required
						autoComplete="new-password"
						error={errors.confirmPassword?.message}
						id="confirm-password"
						label={t("auth.challenge.confirmPassword")}
						maxLength={128}
						type="password"
						toggleLabels={{
							show: t("auth.showConfirmedPassword"),
							hide: t("auth.hideConfirmedPassword"),
						}}
						{...register("confirmPassword")}
					/>
				</fieldset>
				{message && (
					<div ref={messageContainer} tabIndex={-1}>
						<AuthMessage kind="error">{message}</AuthMessage>
					</div>
				)}
				<Button
					className="w-full"
					disabled={isSubmitting || held}
					size="lg"
					type="submit"
				>
					{t(
						isSubmitting ? "auth.challenge.pending" : "auth.challenge.continue"
					)}
				</Button>
			</form>
		</>
	);
};
