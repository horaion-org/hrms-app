import type { CSSProperties } from "react";

/** A roster day's colours when no shift is worked: a day off, or leave. */
export const rosterLooks: Record<"off" | "leave", string> = {
	off: "border-neutral-400 bg-neutral-100 text-neutral-600",
	leave: "border-ink-blue-200 bg-ink-blue-50 text-ink-blue-900",
};

/** How much of a shift's colour tints its tile; the rest is white, so dark text stays readable. */
const TINT_SHARE = 0.15;

const channelsOf = (colour: string): Array<number> =>
	[1, 3, 5].map((offset) =>
		Number.parseInt(colour.slice(offset, offset + 2), 16)
	);

/**
 * A generated shift's tile, coloured by its frozen shift's "#RRGGBB": the
 * colour itself as the border, as the swatch picker shows it, over a light
 * tint of it that dark text reads on.
 */
export const shiftTileStyle = (colour: string): CSSProperties => {
	const [red, green, blue] = channelsOf(colour).map((channel) =>
		Math.round(channel * TINT_SHARE + 255 * (1 - TINT_SHARE))
	);
	return {
		borderColor: colour,
		backgroundColor: `rgb(${red}, ${green}, ${blue})`,
	};
};
