import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { apiRequestVoid } from "@/common/api-client";
import { ApiProblemError, UnreachableError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/features/auth/AuthField";
import { AuthMessage } from "@/features/auth/AuthMessage";
import { failureMessage, retryHoldMessage } from "@/features/auth/errors";
import { emailFromHistory, withEmail } from "@/features/auth/historyState";
import {
	emailConfirmationSchema,
	type EmailConfirmationValues,
} from "@/features/auth/schemas";
import { useRetryHold } from "@/features/auth/useRetryHold";

type Message = { kind: "error" | "status"; text: string };

export const EmailConfirmationForm = (): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const historyState = useRouterState({
		select: (state) => state.location.state,
	});
	const schema = useMemo(() => emailConfirmationSchema(t), [t]);
	const {
		register,
		handleSubmit,
		setError,
		setFocus,
		trigger,
		getValues,
		clearErrors,
		formState: { errors, isSubmitting },
	} = useForm<EmailConfirmationValues>({
		resolver: zodResolver(schema),
		defaultValues: { email: emailFromHistory(historyState) ?? "", code: "" },
	});
	const [resending, setResending] = useState(false);
	const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
	const [message, setMessage] = useState<Message | null>(null);
	const [failure, setFailure] = useState<unknown>(null);
	const hold = useRetryHold(failure);
	const inFlight = useRef(false);
	const refusedField = useRef<keyof EmailConfirmationValues | null>(null);
	const messageContainer = useRef<HTMLDivElement>(null);
	const pending = isSubmitting || resending;
	const displayedMessage =
		failure instanceof ApiProblemError && failure.status === 429
			? { kind: "error" as const, text: retryHoldMessage(hold.message, t) }
			: message;

	useEffect(() => {
		if (confirmedEmail === null) return;
		const timeout = window.setTimeout(() => {
			void navigate({
				to: "/login",
				state: withEmail(confirmedEmail),
			});
		}, 3000);
		return (): void => {
			window.clearTimeout(timeout);
		};
	}, [confirmedEmail, navigate]);

	useEffect(() => {
		if (pending) return;
		if (refusedField.current) {
			setFocus(refusedField.current);
			refusedField.current = null;
		} else if (message) messageContainer.current?.focus();
	}, [pending, message, setFocus]);

	const releaseSubmission = (): void => {
		inFlight.current = false;
	};

	const confirm = async (values: EmailConfirmationValues): Promise<void> => {
		if (inFlight.current || hold.held || confirmedEmail !== null) return;
		inFlight.current = true;
		setMessage(null);
		setFailure(null);
		try {
			await apiRequestVoid("/api/v1/public/sign-up-confirmations", {
				method: "POST",
				anonymous: true,
				body: values,
			});
			setConfirmedEmail(values.email);
			setMessage({
				kind: "status",
				text: t("auth.emailConfirmation.redirecting"),
			});
		} catch (cause) {
			setFailure(cause);
			if (cause instanceof ApiProblemError && cause.reason === "invalid-code") {
				setError("code", {
					type: "server",
					message: t("auth.emailConfirmation.invalidCode"),
				});
				refusedField.current = "code";
				return;
			}
			if (cause instanceof ApiProblemError && cause.status === 400) {
				for (const { field } of cause.fieldErrors) {
					if (field === "email" || field === "code") {
						setError(field, {
							type: "server",
							message: t(
								field === "email"
									? "auth.validation.email"
									: "auth.emailConfirmation.codeFormat"
							),
						});
						refusedField.current ??= field;
					}
				}
				if (refusedField.current) return;
			}
			setMessage({
				kind: "error",
				text:
					cause instanceof UnreachableError ||
					(cause instanceof ApiProblemError && cause.status === 429)
						? failureMessage(cause, t)
						: t("auth.emailConfirmation.failed"),
			});
		} finally {
			releaseSubmission();
		}
	};

	const resend = async (): Promise<void> => {
		if (inFlight.current || pending || hold.held || confirmedEmail !== null)
			return;
		inFlight.current = true;
		try {
			if (!(await trigger("email", { shouldFocus: true }))) return;
			setResending(true);
			clearErrors("code");
			setMessage(null);
			setFailure(null);
			try {
				await apiRequestVoid("/api/v1/public/sign-up-confirmation-codes", {
					method: "POST",
					anonymous: true,
					body: { email: getValues("email").trim() },
				});
			} catch (cause) {
				if (
					cause instanceof UnreachableError ||
					(cause instanceof ApiProblemError && cause.status === 429)
				) {
					setFailure(cause);
					setMessage({ kind: "error", text: failureMessage(cause, t) });
					return;
				}
			}
			setMessage({ kind: "status", text: t("auth.emailConfirmation.resent") });
		} finally {
			releaseSubmission();
			setResending(false);
		}
	};

	const submit = (event: FormEvent<HTMLFormElement>): Promise<void> =>
		handleSubmit(confirm)(event);

	return (
		<>
			<div className="space-y-3">
				<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
					{t("auth.emailConfirmation.title")}
				</h1>
				<p className="text-base leading-6 text-neutral-800">
					{t("auth.emailConfirmation.subtitle")}
				</p>
			</div>
			{displayedMessage && (
				<div ref={messageContainer} className="mt-6" tabIndex={-1}>
					<AuthMessage kind={displayedMessage.kind}>
						{displayedMessage.text}
					</AuthMessage>
				</div>
			)}
			<form noValidate className="mt-9 space-y-8" onSubmit={submit}>
				<fieldset
					className="flex flex-col gap-4"
					disabled={pending || confirmedEmail !== null}
				>
					<legend className="sr-only">
						{t("auth.emailConfirmation.details")}
					</legend>
					<AuthField
						required
						autoCapitalize="none"
						autoComplete="email"
						error={errors.email?.message}
						id="email"
						label={t("auth.emailConfirmation.email")}
						maxLength={320}
						type="email"
						{...register("email")}
					/>
					<AuthField
						required
						autoComplete="one-time-code"
						error={errors.code?.message}
						id="code"
						inputMode="numeric"
						label={t("auth.emailConfirmation.code")}
						maxLength={6}
						{...register("code")}
					/>
				</fieldset>
				<Button
					className="w-full"
					disabled={pending || hold.held || confirmedEmail !== null}
					size="lg"
					type="submit"
				>
					{t(
						isSubmitting
							? "auth.emailConfirmation.pending"
							: "auth.emailConfirmation.submit"
					)}
				</Button>
				<p className="text-center text-base leading-6 text-neutral-800">
					{t("auth.emailConfirmation.didNotReceive")}{" "}
					<Button
						disabled={pending || hold.held || confirmedEmail !== null}
						type="button"
						variant="hyperlink"
						onClick={resend}
					>
						{t(
							resending
								? "auth.emailConfirmation.resending"
								: "auth.emailConfirmation.resend"
						)}
					</Button>
				</p>
			</form>
		</>
	);
};
