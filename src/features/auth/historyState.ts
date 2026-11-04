import type { HistoryState } from "@tanstack/react-router";
import { z } from "zod";

const emailState = z.object({ email: z.string().trim().min(1).max(320) });

/** Why a person arrived at email confirmation: right after signing up, or after Log in found the email unconfirmed. */
export type EmailConfirmationReason = "code-sent" | "log-in-required";

const confirmationReasonState = z.object({
	emailConfirmationReason: z.enum(["code-sent", "log-in-required"]),
});

/** The email another auth screen passed in history state; anything else reads as none. */
export function emailFromHistory(state: unknown): string | undefined {
	const parsed = emailState.safeParse(state);
	return parsed.success ? parsed.data.email : undefined;
}

/** Why the person was sent to email confirmation; anything else reads as none. */
export function emailConfirmationReasonFromHistory(
	state: unknown
): EmailConfirmationReason | undefined {
	const parsed = confirmationReasonState.safeParse(state);
	return parsed.success ? parsed.data.emailConfirmationReason : undefined;
}

/**
 * Carries an email to the next auth screen in history state, which stays with this tab and survives a
 * reload but never reaches a URL, a server log or web storage. The router replaces its own entry keys.
 */
export function withEmail(
	email: string
): (previous: HistoryState) => HistoryState {
	return (previous) => {
		const next = { ...previous, email };
		return next;
	};
}

/** Like {@link withEmail}, and also says why the person is sent to email confirmation. */
export function withEmailConfirmation(
	email: string,
	reason: EmailConfirmationReason
): (previous: HistoryState) => HistoryState {
	return (previous) => {
		const next = {
			...withEmail(email)(previous),
			emailConfirmationReason: reason,
		};
		return next;
	};
}
