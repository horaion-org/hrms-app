import type { CSSProperties } from "react";
import type { CellMark } from "@/features/scheduling/roster/rosterMarks";

/** A roster day's colours when no shift is worked: a day off, or leave. */
export const rosterLooks: Record<"off" | "leave", string> = {
	off: "border-neutral-400 bg-neutral-100 text-neutral-600",
	leave: "border-ink-blue-200 bg-ink-blue-50 text-ink-blue-900",
};

/**
 * A cell's one mark, in the tile's top-right corner (the tile is
 * `relative`): a filled dot to look at, a hollow ring for a day changed by
 * hand. Shape tells them apart as well as colour, and both tones keep 3:1
 * on every shift tint, the Off and Leave tiles and the header.
 */
export const cellMarkLooks: Record<CellMark, string> = {
	issue:
		"pointer-events-none absolute top-1.5 right-1.5 size-2 rounded-full bg-warning-900",
	changed:
		"pointer-events-none absolute top-1.5 right-1.5 size-2 rounded-full ring-[1.5px] ring-ink-blue-700 ring-inset",
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
