import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "@/features/auth/AuthCard";
import { confirmSignUp, resendConfirmationCode } from "@/features/auth/cognito";
import { notifyError, notifySuccess } from "@/store/useToastStore";

type ConfirmEmailPageProps = {
	email: string;
};

/**
 * Until the owner confirms, Cognito refuses to authenticate them at all, so
 * this is a required step rather than a reminder.
 */
export const ConfirmEmailPage = ({
	email,
}: ConfirmEmailPageProps): FunctionComponent => {
	const navigate = useNavigate();
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | undefined>();
	const [busy, setBusy] = useState(false);

	const submit = async (): Promise<void> => {
		setBusy(true);
		setError(undefined);

		try {
			await confirmSignUp(email, code);
			notifySuccess("Email confirmed. You can sign in now.");
			await navigate({ to: "/sign-in" });
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "That code was not accepted."
			);
		} finally {
			setBusy(false);
		}
	};

	const resend = async (): Promise<void> => {
		try {
			await resendConfirmationCode(email);
			notifySuccess("We sent another code.");
		} catch (cause) {
			notifyError(cause);
		}
	};

	return (
		<AuthCard
			description={`We emailed a confirmation code to ${email}.`}
			title="Confirm your email"
			footer={
				<Button
					size="small"
					variant="ghost"
					onClick={() => {
						void resend();
					}}
				>
					Send another code
				</Button>
			}
		>
			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					void submit();
				}}
			>
				<Input
					required
					autoComplete="one-time-code"
					error={error}
					inputMode="numeric"
					label="Confirmation code"
					value={code}
					onChange={(event) => {
						setCode(event.target.value);
					}}
				/>
				<Button fullWidth loading={busy} type="submit">
					Confirm
				</Button>
			</form>
		</AuthCard>
	);
};
