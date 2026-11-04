/** Whether any content is scrolled out of view past each inline edge. */
export type ScrollEdges = { overflowsStart: boolean; overflowsEnd: boolean };

export const NO_OVERFLOW: ScrollEdges = {
	overflowsStart: false,
	overflowsEnd: false,
};

// Browsers report fractional scroll positions on zoomed or high-DPI screens;
// under a pixel of hidden content does not count.
const TOLERANCE = 1;

/**
 * Reads a scrolling frame's metrics. Right-to-left frames report `scrollLeft`
 * as zero or negative, so only its size matters.
 */
export const scrollEdgesOf = ({
	scrollLeft,
	scrollWidth,
	clientWidth,
}: {
	scrollLeft: number;
	scrollWidth: number;
	clientWidth: number;
}): ScrollEdges => {
	const scrolled = Math.abs(scrollLeft);
	const hidden = scrollWidth - clientWidth;
	return {
		overflowsStart: scrolled > TOLERANCE,
		overflowsEnd: hidden - scrolled > TOLERANCE,
	};
};
