import { zodResolver } from "@hookform/resolvers/zod";
import {
	Link,
	useNavigate,
	useSearch,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ApiProblemError } from "@/common/problem";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/features/auth/AuthField";
import { AuthMessage } from "@/features/auth/AuthMessage";
import { useRetryHold } from "@/features/auth/useRetryHold";
import { failureMessage, retryHoldMessage } from "@/features/auth/errors";
import { emailFromHistory, withEmail } from "@/features/auth/historyState";
import { returnPath } from "@/features/auth/returnPath";
import { logInSchema, type LogInValues } from "@/features/auth/schemas";
import { challengePath } from "@/features/auth/challenge";
import { logIn } from "@/features/auth/session";

export const LogInForm = (): FunctionComponent => {
	const { t } = useTranslation();
	const search = useSearch({ strict: false });
	const navigate = useNavigate();
	const historyState = useRouterState({
		select: (state) => state.location.state,
	});
	const schema = useMemo(() => logInSchema(t), [t]);
	const {
		register,
		control,
		handleSubmit,
		setError,
		setFocus,
		formState: { errors, isSubmitting },
	} = useForm<LogInValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			email: emailFromHistory(historyState) ?? "",
			password: "",
		},
	});
	const email = useWatch({ control, name: "email" }).trim();
	const [message, setMessage] = useState<string | null>(null);
	const [failure, setFailure] = useState<unknown>(null);
	const hold = useRetryHold(failure);
	const displayedMessage =
		failure instanceof ApiProblemError && failure.status === 429
			? retryHoldMessage(hold.message, t)
			: message;
	const refusedField = useRef<keyof LogInValues | null>(null);
	const messageContainer = useRef<HTMLDivElement>(null);
	const inFlight = useRef(false);
	useEffect(() => {
		if (isSubmitting) return;
		if (refusedField.current) {
			setFocus(refusedField.current);
			refusedField.current = null;
		} else if (message) messageContainer.current?.focus();
	}, [isSubmitting, message, setFocus]);

	const releaseSubmission = (): void => {
		inFlight.current = false;
	};
	const submitValues = async (values: LogInValues): Promise<void> => {
		if (inFlight.current || hold.held) return;
		inFlight.current = true;
		setMessage(null);
		setFailure(null);
		try {
			const outcome = await logIn(values.email, values.password);
			switch (outcome.kind) {
				case "session":
					await navigate({ href: returnPath(search.redirect) });
					break;
				case "challenge":
					await navigate({
						to: challengePath(outcome.challenge),
						search: { redirect: returnPath(search.redirect) },
					});
					break;
				default: {
					const exhaustive: never = outcome;
					return exhaustive;
				}
			}
		} catch (cause) {
			if (
				cause instanceof ApiProblemError &&
				cause.status === 403 &&
				cause.reason === "email-not-confirmed"
			) {
				await navigate({
					to: "/confirm-email",
					state: withEmail(values.email),
				});
				return;
			}
			setFailure(cause);
			if (cause instanceof ApiProblemError && cause.status === 400) {
				for (const { field } of cause.fieldErrors) {
					if (field === "email" || field === "password") {
						setError(field, {
							type: "server",
							message: t(
								field === "email"
									? "auth.validation.email"
									: "auth.validation.passwordRejected"
							),
						});
						refusedField.current ??= field;
					}
				}
				if (refusedField.current) return;
			}
			setMessage(failureMessage(cause, t));
		} finally {
			releaseSubmission();
		}
	};
	const submit = (event: FormEvent<HTMLFormElement>): Promise<void> =>
		handleSubmit(submitValues)(event);

	return (
		<>
			<div className="space-y-3">
				<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
					{t("auth.logIn.title")}
				</h1>
				<p className="text-base leading-6 text-neutral-800">
					{t("auth.logIn.subtitle")}
				</p>
			</div>
			{search.passwordReset === true && (
				<AuthMessage kind="status">
					{t("auth.passwordReset.success")}
				</AuthMessage>
			)}
			{search.challengeExpired === true && (
				<AuthMessage kind="status">{t("auth.challenge.expired")}</AuthMessage>
			)}
			<form noValidate className="mt-9 space-y-16" onSubmit={submit}>
				<div className="flex flex-col gap-6">
					{displayedMessage && (
						<div ref={messageContainer} tabIndex={-1}>
							<AuthMessage kind="error">{displayedMessage}</AuthMessage>
						</div>
					)}
					<fieldset className="flex flex-col gap-4" disabled={isSubmitting}>
						<legend className="sr-only">{t("auth.logIn.details")}</legend>
						<AuthField
							hideLabel
							required
							autoCapitalize="none"
							autoComplete="email"
							error={errors.email?.message}
							id="email"
							label={t("auth.logIn.email")}
							maxLength={320}
							placeholder={t("auth.logIn.emailPlaceholder")}
							type="email"
							{...register("email")}
						/>
						<AuthField
							hideLabel
							required
							autoComplete="current-password"
							error={errors.password?.message}
							id="password"
							label={t("auth.logIn.password")}
							maxLength={256}
							placeholder={t("auth.logIn.password")}
							type="password"
							toggleLabels={{
								show: t("auth.showPassword"),
								hide: t("auth.hidePassword"),
							}}
							{...register("password")}
						/>
						<div className="mt-6 flex min-h-6 items-center justify-end">
							<Link
								className="text-base leading-6 text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
								state={email ? withEmail(email) : undefined}
								to="/forgot-password"
							>
								{t("auth.logIn.trouble")}
							</Link>
						</div>
					</fieldset>
				</div>
				<Button
					className="w-full"
					disabled={isSubmitting || hold.held}
					size="lg"
					type="submit"
				>
					{t(isSubmitting ? "auth.logIn.pending" : "auth.logIn.title")}
				</Button>
			</form>
			<p className="mt-7 text-center text-base leading-6 text-neutral-800 [&_a]:ml-2">
				{t("auth.logIn.noAccount")}
				<Link
					className="text-ink-blue-900 underline underline-offset-2 hover:text-ink-blue-700"
					to="/register"
				>
					{t("auth.logIn.signUp")}
				</Link>
			</p>
		</>
	);
};
