import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/features/auth/AuthField";
import { AuthMessage } from "@/features/auth/AuthMessage";
import {
	authenticatorCodeSchema,
	type AuthenticatorCodeValues,
} from "@/features/auth/challenge";
import { useChallengeAnswer } from "@/features/auth/useChallengeAnswer";

export const AuthenticatorCodeForm = (): FunctionComponent => {
	const { t } = useTranslation();
	const schema = useMemo(() => authenticatorCodeSchema(t), [t]);
	const {
		register,
		handleSubmit,
		setError,
		setFocus,
		formState: { errors, isSubmitting },
	} = useForm<AuthenticatorCodeValues>({
		resolver: zodResolver(schema),
		defaultValues: { code: "" },
	});
	const { answer, held, message, messageContainer } = useChallengeAnswer(
		(message) => {
			setError("code", { type: "server", message });
		}
	);
	useEffect(() => {
		if (!isSubmitting && errors.code?.type === "server") setFocus("code");
	}, [isSubmitting, errors.code, setFocus]);
	const submit = (values: AuthenticatorCodeValues): Promise<void> =>
		answer({ code: values.code });

	return (
		<>
			<div className="space-y-3">
				<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
					{t("auth.challenge.codeTitle")}
				</h1>
				<p className="text-base leading-6 text-neutral-800">
					{t("auth.challenge.codeSubtitle")}
				</p>
			</div>
			<form
				noValidate
				className="mt-9 space-y-8"
				onSubmit={handleSubmit(submit)}
			>
				<fieldset className="flex flex-col gap-4" disabled={isSubmitting}>
					<legend className="sr-only">{t("auth.challenge.codeTitle")}</legend>
					<AuthField
						required
						autoComplete="one-time-code"
						error={errors.code?.message}
						id="authenticator-code"
						inputMode="numeric"
						label={t("auth.challenge.code")}
						maxLength={6}
						type="text"
						{...register("code")}
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
