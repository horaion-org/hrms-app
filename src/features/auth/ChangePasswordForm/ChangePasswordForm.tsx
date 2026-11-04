import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ApiProblemError, UnreachableError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/features/auth/AuthField";
import { AuthMessage } from "@/features/auth/AuthMessage";
import {
	changePassword,
	changePasswordRefusal,
	changePasswordSchema,
	type ChangePasswordValues,
} from "@/features/auth/changePassword";
import { failureMessage } from "@/features/auth/errors";
import { PasswordRuleChecklist } from "@/features/auth/PasswordRuleChecklist";
import { logOut } from "@/features/auth/session";
import { useRetryHold } from "@/features/auth/useRetryHold";

const RULES_ID = "change-password-rules";

/**
 * The signed-in person's password change. A success ends every Session, this
 * one included, so the form logs out and lands on Log in with a status.
 */
export const ChangePasswordForm = (): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const schema = useMemo(() => changePasswordSchema(t), [t]);
	const {
		register,
		handleSubmit,
		setError,
		setFocus,
		control,
		formState: { errors, isSubmitting },
	} = useForm<ChangePasswordValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});
	const [currentPassword, newPassword] = useWatch({
		control,
		name: ["currentPassword", "newPassword"],
	});
	const [failure, setFailure] = useState<unknown>(null);
	const [message, setMessage] = useState<string | null>(null);
	const hold = useRetryHold(failure);
	const messageContainer = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (message) messageContainer.current?.focus();
	}, [message]);

	const showFailure = (cause: unknown): void => {
		setFailure(cause);
		const refusal = changePasswordRefusal(cause);
		if (refusal) {
			setError(refusal.field, {
				type: "server",
				message: t(refusal.messageKey),
			});
			setFocus(refusal.field);
			return;
		}
		setMessage(
			cause instanceof UnreachableError ||
				(cause instanceof ApiProblemError && cause.status === 429)
				? failureMessage(cause, t)
				: t("auth.changePassword.failed")
		);
	};
	const submit = async (values: ChangePasswordValues): Promise<void> => {
		if (hold.held) return;
		setFailure(null);
		setMessage(null);
		try {
			await changePassword(values.currentPassword, values.newPassword);
		} catch (cause) {
			showFailure(cause);
			return;
		}
		await logOut();
		await navigate({
			to: "/login",
			search: { passwordChanged: true },
			replace: true,
		});
	};
	const newPasswordError = errors.newPassword?.message;

	return (
		<form noValidate className="space-y-8" onSubmit={handleSubmit(submit)}>
			<fieldset className="flex flex-col gap-6" disabled={isSubmitting}>
				<legend className="sr-only">{t("auth.changePassword.details")}</legend>
				<AuthField
					required
					autoComplete="current-password"
					error={errors.currentPassword?.message}
					id="current-password"
					label={t("auth.changePassword.currentPassword")}
					maxLength={256}
					type="password"
					toggleLabels={{
						show: t("auth.changePassword.showCurrentPassword"),
						hide: t("auth.changePassword.hideCurrentPassword"),
					}}
					{...register("currentPassword")}
				/>
				<div className="space-y-3">
					<AuthField
						required
						autoComplete="new-password"
						error={newPasswordError}
						id="new-password"
						label={t("auth.changePassword.newPassword")}
						maxLength={128}
						type="password"
						aria-describedby={
							newPasswordError ? `new-password-error ${RULES_ID}` : RULES_ID
						}
						toggleLabels={{
							show: t("auth.showPassword"),
							hide: t("auth.hidePassword"),
						}}
						{...register("newPassword")}
					/>
					<PasswordRuleChecklist
						currentPassword={currentPassword}
						id={RULES_ID}
						password={newPassword}
					/>
				</div>
				<AuthField
					required
					autoComplete="new-password"
					error={errors.confirmPassword?.message}
					id="confirm-new-password"
					label={t("auth.changePassword.confirmPassword")}
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
			<div className="flex justify-end">
				<Button disabled={isSubmitting || hold.held} type="submit">
					{t(
						isSubmitting
							? "auth.changePassword.pending"
							: "auth.changePassword.submit"
					)}
				</Button>
			</div>
		</form>
	);
};
