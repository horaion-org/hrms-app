import { useEffect, useState } from "react";
import { ApiProblemError } from "@/common/problem";

export type RetryMessage =
	| { kind: "later" }
	| { kind: "about-a-minute" }
	| { kind: "minutes"; count: number };

/** Rounded once for the message, never used to extend the actual hold. */
export function retryMessage(seconds: number | undefined): RetryMessage {
	if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0)
		return { kind: "later" };
	return seconds < 60
		? { kind: "about-a-minute" }
		: { kind: "minutes", count: Math.ceil(seconds / 60) };
}

/** Pass the latest submit failure (or null when starting a new submission). */
export function useRetryHold(error: unknown): {
	held: boolean;
	message: RetryMessage;
} {
	const seconds =
		error instanceof ApiProblemError && error.status === 429
			? error.retryAfterSeconds
			: undefined;
	const [released, setReleased] = useState<unknown>(null);
	const duration =
		seconds !== undefined && Number.isFinite(seconds) && seconds > 0
			? seconds * 1000
			: 0;
	useEffect(() => {
		if (duration === 0) return;
		const timer = setTimeout(() => {
			setReleased(error);
		}, duration);
		return (): void => {
			clearTimeout(timer);
		};
	}, [error, duration]);
	return {
		held: duration > 0 && released !== error,
		message: retryMessage(seconds),
	};
}
