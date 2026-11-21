import { useEffect, useState } from "react";

/** How long the engine may work before the panel says it is still working. */
export const STILL_WORKING_AFTER_MILLISECONDS = 8_000;

/**
 * Whether `active` has held for `afterMilliseconds` without a break; false
 * again as soon as it stops, so the next wait starts afresh.
 */
export const useWaitedLong = (
	active: boolean,
	afterMilliseconds: number
): boolean => {
	const [waited, setWaited] = useState(false);
	useEffect(() => {
		if (!active) return undefined;
		const timer = setTimeout(() => {
			setWaited(true);
		}, afterMilliseconds);
		return (): void => {
			clearTimeout(timer);
			setWaited(false);
		};
	}, [active, afterMilliseconds]);
	return active && waited;
};
