import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ApiProblemError } from "@/common/problem";
import type { FunctionComponent } from "@/common/types";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import {
	getMfaStatus,
	startTotpEnrollment,
	turnOffTotp,
	verifyTotpEnrollment,
	type MfaStatus,
	type TotpSecret,
} from "@/features/auth/api";
import { failureMessage, showFailure } from "@/features/auth/errors";
import {
	turnOffMfaSchema,
	type TurnOffMfaValues,
} from "@/features/auth/schemas";
import { TotpEnrollment } from "@/features/auth/components/TotpEnrollment";
import { notifySuccess, useToastStore } from "@/store/useToastStore";

const MFA_STATUS = ["me", "mfa"] as const;

/**
 * What the password-and-code form asks for. Both need the password and a
 * current code, so someone at an unlocked screen cannot change MFA.
 */
type Change = "off" | "replace";

/**
 * The signed-in person's security settings: turn on an authenticator app,
 * confirmed by its first code, or turn it off or move it to a new device with
 * their password and a current code.
 */
export const SecuritySettingsPage = (): FunctionComponent => {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const status = useQuery({ queryKey: MFA_STATUS, queryFn: getMfaStatus });
	const [enrolment, setEnrolment] = useState<TotpSecret | null>(null);
	const [replacing, setReplacing] = useState(false);
	const [starting, setStarting] = useState(false);
	const [change, setChange] = useState<Change>("off");
	const changeSchema = useMemo(() => turnOffMfaSchema(t), [t]);
	const changeForm = useForm<TurnOffMfaValues>({
		resolver: zodResolver(changeSchema),
		defaultValues: { password: "", code: "" },
	});
	const changeErrors = changeForm.formState.errors;
	const changing = changeForm.formState.isSubmitting;

	const setEnabled = (totpEnabled: boolean): void => {
		queryClient.setQueryData<MfaStatus>(MFA_STATUS, { totpEnabled });
	};

	const startEnrolment = async (): Promise<void> => {
		setStarting(true);

		try {
			setEnrolment(await startTotpEnrollment());
		} catch (cause) {
			useToastStore
				.getState()
				.push("error", failureMessage(cause, t, t("auth.fallbackError")));
		} finally {
			setStarting(false);
		}
	};

	const verify = async (code: string): Promise<void> => {
		await verifyTotpEnrollment(code);
		setEnrolment(null);
		setReplacing(false);
		setEnabled(true);
		notifySuccess(t("auth.security.turnedOn"));
	};

	const onTurnedOff = async (turnedOff: Change): Promise<void> => {
		changeForm.reset();
		setEnabled(false);

		if (turnedOff === "off") {
			notifySuccess(t("auth.security.turnedOff"));

			return;
		}

		setReplacing(true);
		await startEnrolment();
	};

	/** Turns MFA off, or off and on again with a new device. */
	const submitChange = (requested: Change): (() => Promise<void>) =>
		changeForm.handleSubmit(async (values): Promise<void> => {
			setChange(requested);

			try {
				await turnOffTotp(values.password, values.code);
			} catch (cause) {
				// A 400, never a 401: this route must not read as an ended Session.
				if (
					cause instanceof ApiProblemError &&
					cause.errorCode === "INVALID_CREDENTIALS"
				) {
					changeForm.setError("password", {
						message: t("auth.security.wrongPassword"),
					});

					return;
				}

				showFailure(cause, changeForm.setError, {
					fields: ["password", "code"],
					fallbackField: "code",
					fallbackMessage: t("auth.fallbackError"),
					t,
				});

				return;
			}

			await onTurnedOff(requested);
		});

	let content: ReactNode;

	if (enrolment !== null) {
		content = (
			<div className="space-y-4">
				{replacing ? (
					<p className="text-sm text-neutral-700">
						{t("auth.security.replaceStarted")}
					</p>
				) : null}
				<TotpEnrollment
					key={enrolment.secret}
					otpauthUri={enrolment.otpauthUri}
					secret={enrolment.secret}
					onVerify={verify}
				/>
				<Button
					className="w-full"
					variant="textlink"
					onClick={() => {
						setEnrolment(null);
						setReplacing(false);
					}}
				>
					{t("auth.security.cancel")}
				</Button>
			</div>
		);
	} else if (status.isPending) {
		content = (
			<p className="text-sm text-neutral-700">{t("auth.security.loading")}</p>
		);
	} else if (status.isError) {
		content = (
			<div className="space-y-4">
				<p className="text-sm text-error-600" role="alert">
					{t("auth.security.loadError")}
				</p>
				<Button
					variant="secondary"
					onClick={() => {
						void status.refetch();
					}}
				>
					{t("auth.security.retry")}
				</Button>
			</div>
		);
	} else if (status.data.totpEnabled) {
		content = (
			<div className="space-y-6">
				<p className="text-sm text-neutral-900">{t("auth.security.on")}</p>
				<form
					noValidate
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						void submitChange("off")();
					}}
				>
					<p className="text-sm text-neutral-700">
						{t("auth.security.changeIntro")}
					</p>
					<FormField
						error={changeErrors.password?.message}
						label={t("auth.security.password")}
					>
						{(control) => (
							<PasswordInput
								{...control}
								{...changeForm.register("password")}
								autoComplete="current-password"
							/>
						)}
					</FormField>
					<FormField
						error={changeErrors.code?.message}
						label={t("auth.security.code")}
					>
						{(control) => (
							<Input
								{...control}
								{...changeForm.register("code")}
								autoComplete="one-time-code"
								inputMode="numeric"
								maxLength={6}
							/>
						)}
					</FormField>
					<div className="flex flex-col gap-3 sm:flex-row">
						<Button
							className="flex-1"
							disabled={changing}
							loading={changing && change === "replace"}
							onClick={() => {
								void submitChange("replace")();
							}}
						>
							{t("auth.security.replace")}
						</Button>
						<Button
							className="flex-1"
							disabled={changing}
							loading={changing && change === "off"}
							type="submit"
							variant="secondary"
						>
							{t("auth.security.turnOff")}
						</Button>
					</div>
				</form>
			</div>
		);
	} else {
		content = (
			<div className="space-y-6">
				<p className="text-sm text-neutral-900">{t("auth.security.off")}</p>
				<Button
					className="w-full"
					loading={starting}
					onClick={() => {
						void startEnrolment();
					}}
				>
					{t("auth.security.turnOn")}
				</Button>
			</div>
		);
	}

	return (
		<AuthLayout
			description={t("auth.security.subtitle")}
			title={t("auth.security.title")}
		>
			{content}
			<p className="mt-6 text-center text-sm">
				<Link to="/">{t("auth.security.back")}</Link>
			</p>
		</AuthLayout>
	);
};
