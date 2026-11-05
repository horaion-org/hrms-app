import { useCallback, useEffect, useState } from "react";

export const RESEND_COOLDOWN_SECONDS = 60;

/** Seconds as `m:ss`, the form the resend button shows while it waits. */
export function formatCooldown(seconds: number): string {
	const whole = Math.max(0, Math.ceil(seconds));
	return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * A short wait before another code can be requested, held in page state only, so a reload forgets how much
 * was left: a page opened right after a code was sent (`startActive`, from history state that survives the
 * reload) waits the full time again, any other page not at all. The API's own limits (its ADR-0026) still
 * apply. `restart()` begins a full wait.
 */
export function useResendCooldown({
	seconds = RESEND_COOLDOWN_SECONDS,
	startActive,
}: {
	seconds?: number;
	startActive: boolean;
}): { active: boolean; remainingSeconds: number; restart: () => void } {
	const [remainingSeconds, setRemainingSeconds] = useState(
		startActive ? seconds : 0
	);
	const active = remainingSeconds > 0;

	useEffect(() => {
		if (!active) return;
		const interval = window.setInterval(() => {
			setRemainingSeconds((previous) => Math.max(0, previous - 1));
		}, 1000);
		return (): void => {
			window.clearInterval(interval);
		};
	}, [active]);

	const restart = useCallback((): void => {
		setRemainingSeconds(seconds);
	}, [seconds]);

	return { active, remainingSeconds, restart };
}
