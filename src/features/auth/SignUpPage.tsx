import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "@/features/auth/AuthCard";
import { createOnboarding } from "@/features/auth/api";

export const SignUpPage = (): FunctionComponent => {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [companyName, setCompanyName] = useState("");
	const [subdomain, setSubdomain] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [error, setError] = useState<string | undefined>();
	const [busy, setBusy] = useState(false);

	const submit = async (): Promise<void> => {
		setBusy(true);
		setError(undefined);

		try {
			await createOnboarding({
				email,
				password,
				company_name: companyName,
				subdomain,
				display_name: displayName,
			});
			await navigate({ to: "/confirm-email", search: { email } });
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "We could not create it."
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<AuthCard
			description="You will be the owner of this company."
			title="Create your company"
			footer={
				<Link className="underline" to="/sign-in">
					Already have an account? Sign in
				</Link>
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
					label="Company Name"
					maxLength={255}
					value={companyName}
					onChange={(event) => {
						setCompanyName(event.target.value);
					}}
				/>
				<Input
					required
					hint="Your workspace address. Lowercase letters, numbers and hyphens."
					label="Workspace Address"
					maxLength={30}
					value={subdomain}
					onChange={(event) => {
						setSubdomain(event.target.value.toLowerCase());
					}}
				/>
				<Input
					autoComplete="name"
					label="Your Name"
					maxLength={255}
					value={displayName}
					onChange={(event) => {
						setDisplayName(event.target.value);
					}}
				/>
				<Input
					required
					autoComplete="email"
					label="Email Address"
					type="email"
					value={email}
					onChange={(event) => {
						setEmail(event.target.value);
					}}
				/>
				<Input
					required
					autoComplete="new-password"
					error={error}
					hint="At least 8 characters."
					label="Password"
					minLength={8}
					type="password"
					value={password}
					onChange={(event) => {
						setPassword(event.target.value);
					}}
				/>
				<Button fullWidth loading={busy} type="submit">
					Create company
				</Button>
			</form>
		</AuthCard>
	);
};
