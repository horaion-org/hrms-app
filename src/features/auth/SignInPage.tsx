import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "@/features/auth/AuthCard";
import { signIn } from "@/features/auth/cognito";

export const SignInPage = (): FunctionComponent => {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | undefined>();
	const [busy, setBusy] = useState(false);

	const submit = async (): Promise<void> => {
		setBusy(true);
		setError(undefined);

		try {
			const outcome = await signIn(email, password);

			if (outcome.status === "NEW_PASSWORD_REQUIRED") {
				await navigate({ to: "/new-password" });

				return;
			}

			if (outcome.status === "UNCONFIRMED") {
				await navigate({ to: "/confirm-email", search: { email } });

				return;
			}

			await navigate({ to: "/" });
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Sign-in failed.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthCard
			description="Sign in to your workspace."
			title="Horaion"
			footer={
				<>
					<Link className="underline" to="/forgot-password">
						Forgot your password?
					</Link>
					<span className="mx-2">·</span>
					<Link className="underline" to="/sign-up">
						Create a company
					</Link>
				</>
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
					autoComplete="email"
					label="Email address"
					type="email"
					value={email}
					onChange={(event) => {
						setEmail(event.target.value);
					}}
				/>
				<Input
					required
					autoComplete="current-password"
					error={error}
					label="Password"
					type="password"
					value={password}
					onChange={(event) => {
						setPassword(event.target.value);
					}}
				/>
				<Button fullWidth loading={busy} type="submit">
					Sign in
				</Button>
			</form>
		</AuthCard>
	);
};
