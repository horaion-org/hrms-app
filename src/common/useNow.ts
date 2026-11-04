import { useEffect, useState } from "react";

/** The current time, renewed every `intervalMs` while mounted, so relative times ("5 minutes ago") stay current. */
export const useNow = (intervalMs: number): Date => {
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const timer = window.setInterval(() => {
			setNow(new Date());
		}, intervalMs);
		return (): void => {
			window.clearInterval(timer);
		};
	}, [intervalMs]);
	return now;
};
