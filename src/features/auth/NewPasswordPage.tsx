import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "@/features/auth/AuthCard";
import {
	completeNewPassword,
	hasPendingPasswordChallenge,
} from "@/features/auth/cognito";

/**
 * Every invited member meets this on first sign-in, because the API creates
 * them with AdminCreateUser and Cognito emails a temporary password.
 */
export const NewPasswordPage = (): FunctionComponent => {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | undefined>();
	const [busy, setBusy] = useState(false);

	if (!hasPendingPasswordChallenge()) {
		return (
			<AuthCard
				description="Sign in with the temporary password we emailed you to continue."
				title="Nothing to set"
			>
				<Button
					fullWidth
					onClick={() => {
						void navigate({ to: "/sign-in" });
					}}
				>
					Back to sign in
				</Button>
			</AuthCard>
		);
	}

	const submit = async (): Promise<void> => {
		setBusy(true);
		setError(undefined);

		try {
			await completeNewPassword(password);
			await navigate({ to: "/" });
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "That password was refused."
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthCard
			description="Your temporary password has been used. Choose a permanent one."
			title="Set your password"
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
				<Button fullWidth loading={busy} type="submit">
					Set password and continue
				</Button>
			</form>
		</AuthCard>
	);
};
