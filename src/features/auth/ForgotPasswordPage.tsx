import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "@/features/auth/AuthCard";
import { confirmForgotPassword, forgotPassword } from "@/features/auth/cognito";
import { notifySuccess } from "@/store/useToastStore";

export const ForgotPasswordPage = (): FunctionComponent => {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [password, setPassword] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | undefined>();
	const [busy, setBusy] = useState(false);

	const request = async (): Promise<void> => {
		setBusy(true);
		setError(undefined);

		try {
			await forgotPassword(email);
			setSent(true);
			notifySuccess("Check your email for a reset code.");
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "We could not send a code."
			);
		} finally {
			setBusy(false);
		}
	};

	const reset = async (): Promise<void> => {
		setBusy(true);
		setError(undefined);

		try {
			await confirmForgotPassword(email, code, password);
			notifySuccess("Password changed. Sign in with it now.");
			await navigate({ to: "/sign-in" });
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "That code was not accepted."
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthCard
			title="Reset your password"
			description={
				sent
					? "Enter the code we emailed you and choose a new password."
					: "We will email you a code to reset it."
			}
			footer={
				<Link className="underline" to="/sign-in">
					Back to sign in
				</Link>
			}
		>
			<form
				className="space-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					void (sent ? reset() : request());
				}}
			>
				<Input
					required
					autoComplete="email"
					disabled={sent}
					label="Email address"
					type="email"
					value={email}
					onChange={(event) => {
						setEmail(event.target.value);
					}}
				/>
				{sent ? (
					<>
						<Input
							required
							autoComplete="one-time-code"
							inputMode="numeric"
							label="Reset code"
							value={code}
							onChange={(event) => {
								setCode(event.target.value);
							}}
						/>
						<Input
							required
							autoComplete="new-password"
							error={error}
							label="New password"
							minLength={8}
							type="password"
							value={password}
							onChange={(event) => {
								setPassword(event.target.value);
							}}
						/>
					</>
				) : null}
				<Button fullWidth loading={busy} type="submit">
					{sent ? "Change password" : "Send reset code"}
				</Button>
			</form>
		</AuthCard>
	);
};
