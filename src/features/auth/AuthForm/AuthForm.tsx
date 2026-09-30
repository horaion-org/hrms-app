import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { AuthField } from "@/features/auth/AuthField";
import { AuthMessage } from "@/features/auth/AuthMessage";
import { withEmail } from "@/features/auth/historyState";
import { registerCompany } from "@/features/auth/api";
import {
	passwordRequirements,
	registrationFields,
	validateRegistration,
	type RegistrationErrors,
} from "@/features/auth/validation";

export const AuthForm = (): FunctionComponent => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [fieldErrors, setFieldErrors] = useState<RegistrationErrors>({});
	const [submitted, setSubmitted] = useState(false);
	const [pending, setPending] = useState(false);
	const inFlight = useRef(false);
	// A server refusal arrives while the fieldset is disabled, so its input is focused once released.
	const refusedInput = useRef<HTMLElement | null>(null);
	const [error, setError] = useState("");
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
		if (pending || !(event.target instanceof HTMLInputElement)) return;
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
			await navigate({
				to: "/confirm-email",
				state: withEmail(value("email").trim()),
			});
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

	return (
		<>
			<div className="space-y-3">
				<h1 className="text-[32px] leading-12 font-medium text-ink-blue-900">
					Sign up
				</h1>
				<p className="text-base leading-6 text-neutral-800">
					Set up your company account.
				</p>
			</div>
			<form
				noValidate
				className="mt-10 space-y-10"
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
				<fieldset className="flex flex-col gap-6" disabled={pending}>
					<legend className="sr-only">Account details</legend>
					{
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
					}

					<AuthField
						required
						autoCapitalize="none"
						autoComplete="email"
						error={fieldErrors.email}
						id="email"
						label="Email address"
						maxLength={320}
						name="email"
						placeholder="Email address"
						type="email"
					/>
					<AuthField
						required
						autoComplete="new-password"
						error={fieldErrors.password}
						hint={passwordRequirements}
						id="password"
						label="Password"
						maxLength={128}
						minLength={8}
						name="password"
						placeholder="Password"
						title={passwordRequirements}
						type="password"
					/>
					{
						<AuthField
							required
							autoComplete="new-password"
							error={fieldErrors.confirmPassword}
							id="confirmPassword"
							label="Confirm password"
							maxLength={128}
							name="confirmPassword"
							placeholder="Confirm password"
							type="password"
							toggleLabels={{
								show: t("auth.showConfirmedPassword"),
								hide: t("auth.hideConfirmedPassword"),
							}}
						/>
					}
				</fieldset>
				{error && <AuthMessage kind="error">{error}</AuthMessage>}
				<Button className="w-full" disabled={pending} size="lg" type="submit">
					{pending ? "Creating account…" : "Sign up"}
				</Button>
			</form>
			<p className="mt-7 text-center text-base leading-6 text-neutral-800 [&_a]:ml-2">
				Already have an account?
				<Link
					className="text-ink-blue-900 underline underline-offset-2 hover:text-ink-blue-700"
					to="/login"
				>
					Log in
				</Link>
			</p>
		</>
	);
};
