import { zodResolver } from "@hookform/resolvers/zod";
import { toString as qrCodeSvg } from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { Button } from "@/components/ui/Button";
import { showFailure } from "@/features/auth/errors";
import { mfaCodeSchema, type MfaCodeValues } from "@/features/auth/schemas";
import { notifyError, notifySuccess } from "@/store/useToastStore";

export type TotpEnrollmentProps = {
	/** The authenticator secret, shown as text for people who cannot scan. */
	secret: string;
	/** The otpauth URI the QR code encodes. */
	otpauthUri: string;
	/**
	 * Confirms the authenticator with its first code. A rejection is shown on
	 * the code field, so a failed scan never turns MFA on.
	 */
	onVerify: (code: string) => Promise<void>;
};

/** Draws the otpauth URI as an SVG QR code, locally: the secret never leaves the page. */
const useQrCode = (otpauthUri: string): string | undefined => {
	const [source, setSource] = useState<{ uri: string; image: string }>();

	useEffect(() => {
		let current = true;

		qrCodeSvg(otpauthUri, { type: "svg", margin: 1 })
			.then((svg) => {
				if (current) {
					setSource({
						uri: otpauthUri,
						image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
					});
				}
			})
			.catch(() => {
				// The secret below still lets the person add the app by hand.
			});

		return (): void => {
			current = false;
		};
	}, [otpauthUri]);

	return source?.uri === otpauthUri ? source.image : undefined;
};

/**
 * Adds an authenticator app: a QR code of the otpauth URI, the same secret as
 * copyable text, and the app's first code to confirm it before MFA takes
 * effect.
 */
export const TotpEnrollment = ({
	secret,
	otpauthUri,
	onVerify,
}: TotpEnrollmentProps): FunctionComponent => {
	const { t } = useTranslation();
	const qrCode = useQrCode(otpauthUri);
	const schema = useMemo(() => mfaCodeSchema(t), [t]);
	const {
		register,
		handleSubmit,
		setError,
		formState: { errors, isSubmitting },
	} = useForm<MfaCodeValues>({
		resolver: zodResolver(schema),
		defaultValues: { code: "" },
	});

	const onSubmit = handleSubmit(async (values): Promise<void> => {
		try {
			await onVerify(values.code);
		} catch (cause) {
			showFailure(cause, setError, {
				fields: ["code"],
				fallbackField: "code",
				fallbackMessage: t("auth.fallbackError"),
				t,
			});
		}
	});

	const copySecret = async (): Promise<void> => {
		try {
			await navigator.clipboard.writeText(secret);
			notifySuccess(t("auth.totp.copied"));
		} catch {
			// The browser's reason is not worth showing; the key stays selectable.
			notifyError(undefined, t("auth.totp.copyFailed"));
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col items-center gap-3">
				<p className="text-sm text-neutral-700">{t("auth.totp.scan")}</p>
				<div className="size-48 rounded-lg border border-neutral-400 bg-white p-2">
					{qrCode === undefined ? null : (
						<img
							alt={t("auth.totp.qrAlt")}
							className="size-full"
							src={qrCode}
						/>
					)}
				</div>
			</div>
			<div className="space-y-2">
				<p className="text-sm text-neutral-700">{t("auth.totp.secretLabel")}</p>
				<div className="flex items-center justify-between gap-3 rounded-lg bg-neutral-200 px-4 py-2">
					<code className="font-mono text-sm break-all text-neutral-900 select-all">
						{secret}
					</code>
					<Button
						variant="textlink"
						onClick={() => {
							void copySecret();
						}}
					>
						{t("auth.totp.copy")}
					</Button>
				</div>
			</div>
			<form noValidate className="space-y-4" onSubmit={onSubmit}>
				<FormField
					error={errors.code?.message}
					hint={t("auth.totp.hint")}
					label={t("auth.totp.code")}
				>
					{(control) => (
						<Input
							{...control}
							{...register("code")}
							autoComplete="one-time-code"
							inputMode="numeric"
							maxLength={6}
						/>
					)}
				</FormField>
				<Button className="w-full" loading={isSubmitting} type="submit">
					{t("auth.totp.submit")}
				</Button>
			</form>
		</div>
	);
};
