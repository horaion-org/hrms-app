/*
 * The colours a chart may draw a series in: shades of the app's own ranges
 * (src/styles/tokens.css), named by shade so every chart reads alike.
 * Status colours are left out on purpose: a chart's colour names a series,
 * never how well it is doing.
 */

export const chartColours = [
	"inkBlue900",
	"inkBlue500",
	"inkBlue200",
	"porcelain300",
	"porcelain500",
	"success600",
	"neutral400",
] as const;

/** A series colour, by the shade it draws in. */
export type ChartColour = (typeof chartColours)[number];

/** Each colour as an SVG fill. */
export const CHART_FILL_CLASSES: Record<ChartColour, string> = {
	inkBlue900: "fill-ink-blue-900",
	inkBlue500: "fill-ink-blue-500",
	inkBlue200: "fill-ink-blue-200",
	porcelain300: "fill-porcelain-300",
	porcelain500: "fill-porcelain-500",
	success600: "fill-success-600",
	neutral400: "fill-neutral-400",
};

/** Each colour as a block's background: a bar drawn in HTML, or a legend's key. */
export const CHART_BACKGROUND_CLASSES: Record<ChartColour, string> = {
	inkBlue900: "bg-ink-blue-900",
	inkBlue500: "bg-ink-blue-500",
	inkBlue200: "bg-ink-blue-200",
	porcelain300: "bg-porcelain-300",
	porcelain500: "bg-porcelain-500",
	success600: "bg-success-600",
	neutral400: "bg-neutral-400",
};

/** One series a chart draws: its id in the data, its name, its colour. */
export type ChartSeries = {
	id: string;
	label: string;
	colour: ChartColour;
};

/** A legend's list, shared so every chart's legend reads alike. */
export const LEGEND_LIST_CLASSES =
	"flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-800";

/** One legend entry: its key, then its name. */
export const LEGEND_ITEM_CLASSES = "flex items-center gap-1";

/** A legend's key: a small block in the series' colour. */
export const LEGEND_KEY_CLASSES = "size-2 shrink-0 rounded-xs";
