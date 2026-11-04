import { useEffect, useState, type RefObject } from "react";
import {
	NO_OVERFLOW,
	scrollEdgesOf,
	type ScrollEdges,
} from "@/components/ui/DataTable/scrollEdges";

/**
 * Follows which edges of a horizontally scrolling frame hide content, on
 * scroll and on resize. Does nothing while `enabled` is false.
 */
export const useScrollEdges = (
	frameRef: RefObject<HTMLElement | null>,
	enabled: boolean
): ScrollEdges => {
	const [edges, setEdges] = useState<ScrollEdges>(NO_OVERFLOW);
	useEffect(() => {
		const frame = frameRef.current;
		if (!enabled || !frame) return;
		const update = (): void => {
			const next = scrollEdgesOf(frame);
			setEdges((previous) =>
				previous.overflowsStart === next.overflowsStart &&
				previous.overflowsEnd === next.overflowsEnd
					? previous
					: next
			);
		};
		update();
		frame.addEventListener("scroll", update, { passive: true });
		const observer = new ResizeObserver(update);
		observer.observe(frame);
		if (frame.firstElementChild) observer.observe(frame.firstElementChild);
		return (): void => {
			frame.removeEventListener("scroll", update);
			observer.disconnect();
		};
	}, [frameRef, enabled]);
	return enabled ? edges : NO_OVERFLOW;
};
