import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { FormField } from "@/components/forms/FormField";
import { Input } from "@/components/forms/Input";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/components/ui/Link";
import { showFailure } from "@/features/auth/errors";
import { useChallengeScreen } from "@/features/auth/hooks/useChallengeScreen";
import { returnPath } from "@/features/auth/returnPath";
import { mfaCodeSchema, type MfaCodeValues } from "@/features/auth/schemas";
import { answerChallenge } from "@/features/auth/session";

/**
 * Answers the MFA Challenge with a code from the person's authenticator app,
 * after their password. Reached without a pending Challenge (say, after a
 * reload), it sends them back to sign in.
 */
export const MfaChallengePage = (): FunctionComponent => {
	const screen = useChallengeScreen("SOFTWARE_TOKEN_MFA");
	const search: { redirect?: unknown } = useSearch({ strict: false });
	const { t } = useTranslation();
	const navigate = useNavigate();
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
			const outcome = await answerChallenge({ code: values.code });

			if (outcome.status === "SIGNED_IN") {
				await navigate({ href: returnPath(search.redirect) });

				return;
			}

			setError("code", { message: t("auth.fallbackError") });
		} catch (cause) {
			showFailure(cause, setError, {
				fields: ["code"],
				fallbackField: "code",
				fallbackMessage: t("auth.fallbackError"),
				t,
			});
		}
	});

	return (
		<AuthLayout description={screen.description} title={screen.title}>
			<div className="space-y-4">
				{screen.pending && (
					<form noValidate className="space-y-4" onSubmit={onSubmit}>
						<FormField error={errors.code?.message} label={t("auth.mfa.code")}>
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
							{t("auth.mfa.submit")}
						</Button>
					</form>
				)}
				<p className="text-center text-sm">
					<Link to="/sign-in">{screen.back}</Link>
				</p>
			</div>
		</AuthLayout>
	);
};
