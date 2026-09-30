import type { HistoryState } from "@tanstack/react-router";
import { z } from "zod";

const emailState = z.object({ email: z.string().trim().min(1).max(320) });

/** The email another auth screen passed in history state; anything else reads as none. */
export function emailFromHistory(state: unknown): string | undefined {
	const parsed = emailState.safeParse(state);
	return parsed.success ? parsed.data.email : undefined;
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
