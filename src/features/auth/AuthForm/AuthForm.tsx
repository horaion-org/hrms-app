import { useEffect, useRef, useState, type FormEvent } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { Checkbox } from "@/components/ui/Checkbox";
import { Link } from "@tanstack/react-router";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/features/auth/AuthField";
import { registerCompany } from "@/features/auth/api";
import {
	passwordRequirements,
	registrationFields,
	validateRegistration,
	type RegistrationErrors,
} from "@/features/auth/validation";

export const AuthForm = ({
	mode,
}: {
	mode: "login" | "register";
}): FunctionComponent => {
	const registering = mode === "register";
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<RegistrationErrors>({});
	const [submitted, setSubmitted] = useState(false);
	const [remember, setRemember] = useState(true);
	const [pending, setPending] = useState(false);
	const inFlight = useRef(false);
	// A server refusal arrives while the fieldset is disabled, so its input is focused once released.
	const refusedInput = useRef<HTMLElement | null>(null);
	const [error, setError] = useState("");
	const [complete, setComplete] = useState(false);
	const releaseSubmission = (): void => {
		inFlight.current = false;
		setPending(false);
	};

	useEffect(() => {
		if (pending || !refusedInput.current) return;
		refusedInput.current.focus();
		refusedInput.current = null;
	}, [pending]);

	const checkFields = (
		event: FormEvent<HTMLFormElement>,
		onBlur: boolean
	): void => {
		if (!registering || pending || !(event.target instanceof HTMLInputElement))
			return;
		const targetName = event.target.name;
		const field = registrationFields.find((name) => name === targetName);
		if (!field) return;
		const errors = validateRegistration(new FormData(event.currentTarget));
		if (submitted) setFieldErrors(errors);
		else if (onBlur || fieldErrors[field]) {
			setFieldErrors((current) => ({
				...current,
				[field]: errors[field],
				...(field === "password" && current.confirmPassword
					? { confirmPassword: errors.confirmPassword }
					: {}),
			}));
		}
	};

	const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		if (inFlight.current) return;
		setError("");
		if (!registering) {
			setError(
				"Sign-in is not available yet. Please try again once Horaion sign-in is enabled."
			);
			return;
		}
		const form = event.currentTarget;
		const data = new FormData(form);
		const value = (name: string): string => {
			const entry = data.get(name);
			return typeof entry === "string" ? entry : "";
		};
		const errors = validateRegistration(data);
		setSubmitted(true);
		setFieldErrors(errors);
		const invalidField = registrationFields.find((field) => errors[field]);
		if (invalidField) {
			const input = form.elements.namedItem(invalidField);
			if (input instanceof HTMLElement) input.focus();
			return;
		}

		inFlight.current = true;
		setPending(true);
		try {
			const refused = await registerCompany({
				displayName: `${value("firstName").trim()} ${value("lastName").trim()}`,
				companyName: value("companyName").trim(),
				registrationNumber: value("registrationNumber").trim(),
				subdomain: value("subdomain").trim(),
				email: value("email").trim(),
				password: value("password"),
			});
			const refusedField = registrationFields.find((field) => refused[field]);
			if (refusedField) {
				setFieldErrors(refused);
				const input = form.elements.namedItem(refusedField);
				if (input instanceof HTMLElement) refusedInput.current = input;
				return;
			}
			form.reset();
			setComplete(true);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Something went wrong. Please try again."
			);
		} finally {
			releaseSubmission();
		}
	};

	if (complete)
		return (
			<div className="space-y-6">
				<h1 className="text-3xl font-semibold tracking-tight">
					Check your email
				</h1>
				<p className="leading-relaxed text-neutral-800" role="status">
					Your workspace has been created. Please verify your email before
					signing in to Horaion.
				</p>
				<Link
					className="font-medium text-ink-blue-900 underline underline-offset-4"
					to="/login"
				>
					Back to log in
				</Link>
			</div>
		);

	return (
		<>
			<div className="space-y-3">
				<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
					{registering ? "Sign up" : "Log in"}
				</h1>
				<p className="text-base leading-6 text-neutral-800">
					{registering
						? "Set up your company account."
						: "Sign in with your email and password."}
				</p>
			</div>
			<form
				className={registering ? "mt-10 space-y-10" : "mt-9 space-y-16"}
				noValidate={registering}
				onSubmit={submit}
				onBlur={(event): void => {
					// Let submission validate before adding errors that could move the clicked button.
					if (
						event.relatedTarget instanceof HTMLButtonElement &&
						event.relatedTarget.type === "submit"
					)
						return;
					checkFields(event, true);
				}}
				onChange={(event): void => {
					checkFields(event, false);
				}}
			>
				<fieldset
					disabled={pending}
					className={
						registering ? "flex flex-col gap-6" : "flex flex-col gap-4"
					}
				>
					<legend className="sr-only">
						{registering ? "Account details" : "Login details"}
					</legend>
					{registering && (
						<>
							<div className="grid grid-cols-1 gap-6 min-[480px]:grid-cols-2 min-[480px]:gap-5">
								<AuthField
									required
									autoComplete="organization"
									error={fieldErrors.companyName}
									id="companyName"
									label="Company name"
									maxLength={255}
									name="companyName"
									pattern=".*\S.*"
									placeholder="Company name"
								/>
								<AuthField
									required
									error={fieldErrors.registrationNumber}
									id="registrationNumber"
									label="Registration number"
									maxLength={64}
									name="registrationNumber"
									pattern=".*\S.*"
									placeholder="Registration number"
								/>
							</div>
							<div className="grid grid-cols-1 gap-6 min-[480px]:grid-cols-2 min-[480px]:gap-5">
								<AuthField
									required
									autoComplete="given-name"
									error={fieldErrors.firstName}
									id="firstName"
									label="First name"
									maxLength={127}
									name="firstName"
									pattern=".*\S.*"
									placeholder="First name"
								/>
								<AuthField
									required
									autoComplete="family-name"
									error={fieldErrors.lastName}
									id="lastName"
									label="Last name"
									maxLength={127}
									name="lastName"
									pattern=".*\S.*"
									placeholder="Last name"
								/>
							</div>
							<AuthField
								required
								autoCapitalize="none"
								error={fieldErrors.subdomain}
								hint="A unique name for your workspace, such as acme-team."
								id="subdomain"
								label="Workspace name"
								maxLength={30}
								minLength={3}
								name="subdomain"
								pattern="[a-z0-9][a-z0-9\-]{1,28}[a-z0-9]"
								placeholder="your-company"
								spellCheck={false}
								title="3–30 lowercase letters, numbers, or hyphens. Start and end with a letter or number."
							/>
						</>
					)}

					<AuthField
						required
						autoCapitalize="none"
						autoComplete="email"
						error={fieldErrors.email}
						hideLabel={!registering}
						id="email"
						label={registering ? "Email address" : "Email"}
						maxLength={320}
						name="email"
						placeholder="Email address"
						type="email"
					/>
					<AuthField
						required
						autoComplete={registering ? "new-password" : "current-password"}
						error={fieldErrors.password}
						hideLabel={!registering}
						hint={registering ? passwordRequirements : undefined}
						id="password"
						label="Password"
						maxLength={registering ? 128 : undefined}
						minLength={registering ? 8 : undefined}
						name="password"
						placeholder="Password"
						title={registering ? passwordRequirements : undefined}
						type={showPassword ? "text" : "password"}

						trailingIcon={
							<Button
								aria-label={showPassword ? "Hide password" : "Show password"}
								aria-pressed={showPassword}
								variant="icon"
								onClick={(): void => {
									setShowPassword(!showPassword);
								}}
							>
								{showPassword ? (
									<EyeSlashIcon aria-hidden="true" />
								) : (
									<EyeIcon aria-hidden="true" />
								)}
							</Button>
						}
					/>
					{registering && (
						<AuthField
							required
							autoComplete="new-password"
							error={fieldErrors.confirmPassword}
							id="confirmPassword"
							label="Confirm password"
							maxLength={128}
							name="confirmPassword"
							placeholder="Confirm password"
							type={showConfirmation ? "text" : "password"}
							trailingIcon={
								<Button
									aria-pressed={showConfirmation}
									variant="icon"
									aria-label={
										showConfirmation
											? "Hide confirmed password"
											: "Show confirmed password"
									}
									onClick={(): void => {
										setShowConfirmation(!showConfirmation);
									}}
								>
									{showConfirmation ? (
										<EyeSlashIcon aria-hidden="true" />
									) : (
										<EyeIcon aria-hidden="true" />
									)}
								</Button>
							}
						/>
					)}
					{!registering && (
						<div className="mt-6 flex min-h-6 items-center justify-between gap-2">
							<Checkbox
								checked={remember}
								label="Remember me"
								onChange={(event): void => {
									setRemember(event.target.checked);
								}}
							/>
							<Link
								className="text-base leading-6 text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
								to="/forgot-password"
							>
								Having trouble signing in?
							</Link>
						</div>
					)}
				</fieldset>
				{error && (
					<p
						className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-900"
						role="alert"
					>
						{error}
					</p>
				)}
				<Button className="w-full" disabled={pending} size="lg" type="submit">
					{pending ? "Creating account…" : registering ? "Sign up" : "Log in"}
				</Button>
			</form>
			<p className="mt-7 text-center text-base leading-6 text-neutral-800 [&_a]:ml-2">
				{registering ? "Already have an account?" : "Don’t have an account?"}
				<Link
					className="text-ink-blue-900 underline underline-offset-2 hover:text-ink-blue-700"
					to={registering ? "/login" : "/register"}
				>
					{registering ? "Log in" : "Sign up"}
				</Link>
			</p>
		</>
	);
};
