import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { apiRequestVoid } from "@/common/api-client";
import { ApiProblemError, UnreachableError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/features/auth/AuthField";
import { AuthMessage } from "@/features/auth/AuthMessage";
import { failureMessage } from "@/features/auth/errors";
import { emailFromHistory, withEmail } from "@/features/auth/historyState";
import { endSession } from "@/features/auth/session";
import { useRetryHold } from "@/features/auth/useRetryHold";

type Step = { step: "request" } | { step: "complete"; email: string };
type Values = {
	email: string;
	code: string;
	newPassword: string;
	confirmPassword: string;
};
const endpoint = "/api/v1/public/password-resets";
const schemaFor = (
	t: TFunction,
	step: Step["step"]
): z.ZodType<Values, Values> =>
	z
		.object({
			email: z
				.string()
				.trim()
				.max(320, t("auth.validation.tooLong", { max: 320 }))
				.pipe(z.email(t("auth.validation.email"))),
			code: z.string(),
			newPassword: z.string(),
			confirmPassword: z.string(),
		})
		.superRefine((values, context) => {
			if (step === "request") return;
			if (!/^\d{6}$/.test(values.code))
				context.addIssue({
					code: "custom",
					path: ["code"],
					message: t("auth.passwordReset.codeFormat"),
				});
			const password = values.newPassword;
			if (
				password.length < 8 ||
				password.length > 128 ||
				!/[a-z]/.test(password) ||
				!/[A-Z]/.test(password) ||
				!/\d/.test(password) ||
				!/[\^$*.[\]{}()?"!@#%&/\\,><':;|_~`=+\- ]/.test(password)
			)
				context.addIssue({
					code: "custom",
					path: ["newPassword"],
					message: t("auth.passwordReset.passwordPolicy"),
				});
			if (values.confirmPassword !== password || !values.confirmPassword)
				context.addIssue({
					code: "custom",
					path: ["confirmPassword"],
					message: t("auth.passwordReset.passwordMismatch"),
				});
		});

export const PasswordResetForm = (): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const historyState = useRouterState({
		select: (state) => state.location.state,
	});
	const [step, setStep] = useState<Step>({ step: "request" });
	const schema = useMemo(() => schemaFor(t, step.step), [t, step.step]);
	const {
		register,
		handleSubmit,
		setError,
		setFocus,
		clearErrors,
		trigger,
		getValues,
		formState: { errors },
	} = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: {
			email: emailFromHistory(historyState) ?? "",
			code: "",
			newPassword: "",
			confirmPassword: "",
		},
	});
	const [pending, setPending] = useState(false);
	const [failure, setFailure] = useState<unknown>(null);
	const [message, setMessage] = useState<{
		kind: "status" | "error";
		text: string;
	} | null>(null);
	const hold = useRetryHold(failure);
	const inFlight = useRef(false);
	const focusField = useRef<keyof Values | null>(null);
	const messageContainer = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (pending) return;
		if (focusField.current) {
			setFocus(focusField.current);
			focusField.current = null;
		} else if (message) messageContainer.current?.focus();
	}, [pending, message, setFocus]);

	const refuseField = (field: keyof Values, text: string): void => {
		setError(field, { type: "server", message: text });
		focusField.current ??= field;
	};
	const showFailure = (cause: unknown): void => {
		setFailure(cause);
		if (cause instanceof ApiProblemError && cause.status === 400) {
			if (step.step === "complete" && cause.reason === "invalid-code")
				refuseField("code", t("auth.passwordReset.invalidCode"));
			else if (
				step.step === "complete" &&
				cause.reason === "password-policy-violation"
			)
				refuseField("newPassword", t("auth.passwordReset.passwordPolicy"));
			else
				for (const { field } of cause.fieldErrors) {
					if (field === "email") refuseField(field, t("auth.validation.email"));
					if (step.step === "complete" && field === "code")
						refuseField(field, t("auth.passwordReset.codeFormat"));
					if (step.step === "complete" && field === "newPassword")
						refuseField(field, t("auth.passwordReset.passwordPolicy"));
				}
			if (focusField.current) return;
		}
		setMessage({
			kind: "error",
			text:
				cause instanceof UnreachableError ||
				(cause instanceof ApiProblemError && cause.status === 429)
					? failureMessage(cause, t)
					: t("auth.passwordReset.failed"),
		});
	};
	const releaseSubmission = (): void => {
		inFlight.current = false;
	};
	const perform = async (operation: () => Promise<void>): Promise<void> => {
		if (inFlight.current || hold.held) return;
		inFlight.current = true;
		setPending(true);
		setFailure(null);
		setMessage(null);
		clearErrors();
		try {
			await operation();
		} catch (cause) {
			showFailure(cause);
		} finally {
			releaseSubmission();
			setPending(false);
		}
	};
	const requestCode = async (email: string): Promise<void> => {
		await apiRequestVoid(endpoint, {
			method: "POST",
			anonymous: true,
			body: { email },
		});
		setStep({ step: "complete", email });
		setMessage({ kind: "status", text: t("auth.passwordReset.sent") });
		focusField.current = "code";
	};
	const submitValues = (values: Values): Promise<void> =>
		perform(async () => {
			switch (step.step) {
				case "request":
					await requestCode(values.email);
					break;
				case "complete":
					await apiRequestVoid(`${endpoint}/completions`, {
						method: "POST",
						anonymous: true,
						body: {
							email: values.email,
							code: values.code,
							newPassword: values.newPassword,
						},
					});
					endSession("expired");
					await navigate({
						to: "/login",
						search: { passwordReset: true },
						state: withEmail(values.email),
					});
					break;
				default: {
					const exhaustive: never = step;
					return exhaustive;
				}
			}
		});
	const submit = (event: FormEvent<HTMLFormElement>): Promise<void> => {
		if (inFlight.current || hold.held) {
			event.preventDefault();
			return Promise.resolve();
		}
		return handleSubmit(submitValues)(event);
	};
	const resend = async (): Promise<void> => {
		if (
			inFlight.current ||
			hold.held ||
			!(await trigger("email", { shouldFocus: true }))
		)
			return;
		await perform(() => requestCode(getValues("email").trim()));
	};

	return (
		<>
			<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
				{t("auth.passwordReset.title")}
			</h1>
			<p className="mt-3 text-base leading-6 text-neutral-800">
				{t(
					step.step === "request"
						? "auth.passwordReset.requestSubtitle"
						: "auth.passwordReset.completeSubtitle"
				)}
			</p>
			<form noValidate className="mt-9 space-y-6" onSubmit={submit}>
				<fieldset className="flex flex-col gap-4" disabled={pending}>
					<legend className="sr-only">{t("auth.passwordReset.details")}</legend>
					<AuthField
						required
						autoCapitalize="none"
						autoComplete="email"
						error={errors.email?.message}
						id="reset-email"
						label={t("auth.passwordReset.email")}
						maxLength={320}
						type="email"
						{...register("email")}
					/>
					{step.step === "complete" && (
						<>
							<AuthField
								required
								autoComplete="one-time-code"
								error={errors.code?.message}
								id="reset-code"
								inputMode="numeric"
								label={t("auth.passwordReset.code")}
								maxLength={6}
								pattern="[0-9]{6}"
								type="text"
								{...register("code")}
							/>
							<AuthField
								required
								autoComplete="new-password"
								error={errors.newPassword?.message}
								hint={t("auth.passwordReset.passwordPolicy")}
								id="reset-password"
								label={t("auth.passwordReset.newPassword")}
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
								id="reset-confirm"
								label={t("auth.passwordReset.confirmPassword")}
								maxLength={128}
								type="password"
								toggleLabels={{
									show: t("auth.showConfirmedPassword"),
									hide: t("auth.hideConfirmedPassword"),
								}}
								{...register("confirmPassword")}
							/>
						</>
					)}
				</fieldset>
				{message && (
					<div ref={messageContainer} tabIndex={-1}>
						<AuthMessage kind={message.kind}>{message.text}</AuthMessage>
					</div>
				)}
				<Button
					className="w-full"
					disabled={pending || hold.held}
					type="submit"
				>
					{t(
						pending
							? "auth.passwordReset.pending"
							: step.step === "request"
								? "auth.passwordReset.request"
								: "auth.passwordReset.complete"
					)}
				</Button>
				{step.step === "complete" && (
					<Button
						className="w-full"
						disabled={pending || hold.held}
						type="button"
						onClick={resend}
					>
						{t("auth.passwordReset.resend")}
					</Button>
				)}
			</form>
			<p className="mt-7 text-center">
				<Link
					className="text-ink-blue-900 underline underline-offset-2"
					state={step.step === "complete" ? withEmail(step.email) : undefined}
					to="/login"
				>
					{t("auth.passwordReset.back")}
				</Link>
			</p>
		</>
	);
};
