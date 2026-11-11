import { useEffect, useState } from "react";

/**
 * `value` once it has stayed the same for `delayMs`, so a search box does
 * not send a request per keystroke. It starts as `value` itself.
 */
export const useDebouncedValue = <T>(value: T, delayMs = 250): T => {
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
