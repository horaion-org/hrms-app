import { useEffect, useState } from "react";

/**
 * Generic reusable hook: returns a debounced copy of `value` that only updates
 * after `delayMs` has elapsed without a change. Handy for search/filter inputs.
 */
export const useDebouncedValue = <T>(value: T, delayMs = 300): T => {
	const [debounced, setDebounced] = useState<T>(value);

	useEffect((): (() => void) => {
		const timeoutId = setTimeout((): void => {
			setDebounced(value);
		}, delayMs);

		return (): void => {
			clearTimeout(timeoutId);
		};
	}, [value, delayMs]);

	return debounced;
};
