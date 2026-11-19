import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import {
	CHART_BACKGROUND_CLASSES,
	CHART_FILL_CLASSES,
	LEGEND_ITEM_CLASSES,
	LEGEND_KEY_CLASSES,
	LEGEND_LIST_CLASSES,
	type ChartSeries,
} from "@/components/charts/chartColours";

/** One column: its label under the axis and its amount in each series, by series id. */
export type ChartColumn = {
	id: string;
	label: string;
	values: Readonly<Record<string, number>>;
};

/** One chart of the set: its title, such as a Branch, and its columns. */
export type ColumnGroup = {
	id: string;
	title?: string;
	columns: ReadonlyArray<ChartColumn>;
};

export type ColumnChartProps = {
	/** What the columns measure, e.g. "People short by week". */
	label: string;
	/** The series stacked in each column, the first at the bottom. */
	series: ReadonlyArray<ChartSeries>;
	/** One chart per group, side by side on one scale so they compare. */
	groups: ReadonlyArray<ColumnGroup>;
	/** "sm" draws narrow columns, for many of them. */
	size?: "md" | "sm";
	className?: string;
};

/** The room above the plot for a column's amount, in px. */
const AMOUNT_HEIGHT = 16;
/** The plot's height, in px: the tallest column. */
const PLOT_HEIGHT = 96;
/** The room under the plot for a column's label, in px. */
const LABEL_HEIGHT = 16;
/** The least a column with something in it is drawn, in px, so it is never lost. */
const LEAST_COLUMN_HEIGHT = 2;
/** A column's width and the gap to the next, in px, by size. */
const COLUMN_SIZES = {
	md: { width: 32, gap: 16 },
	sm: { width: 16, gap: 8 },
} as const;

/** A column's amount across the series. */
const totalOf = (
	column: ChartColumn,
	series: ReadonlyArray<ChartSeries>
): number =>
	series.reduce((sum, each) => sum + (column.values[each.id] ?? 0), 0);

/** The label read out for one chart: what it measures, its title, then each column's amount. */
const describe = (
	label: string,
	group: ColumnGroup,
	series: ReadonlyArray<ChartSeries>
): string => {
	const columns = group.columns
		.map((column) => `${column.label} ${totalOf(column, series)}`)
		.join(", ");
	return `${group.title ? `${label}, ${group.title}` : label}: ${columns}`;
};

/** One column's stacked parts, from the axis up, each with its top edge and height in px. */
const partsOf = (
	column: ChartColumn,
	series: ReadonlyArray<ChartSeries>,
	scale: number
): Array<{ series: ChartSeries; top: number; height: number }> => {
	let top = AMOUNT_HEIGHT + PLOT_HEIGHT;
	return series
		.filter((each) => (column.values[each.id] ?? 0) > 0)
		.map((each) => {
			const height = Math.max(
				((column.values[each.id] ?? 0) / scale) * PLOT_HEIGHT,
				LEAST_COLUMN_HEIGHT
			);
			top -= height;
			return { series: each, top, height };
		});
};

/**
 * Columns over an axis, stacked by series, one chart per group on a shared
 * scale: small charts side by side, so sites or periods compare at a
 * glance. Drawn at its own size, never scaled, so its labels stay
 * readable; each column's amount is written above it and read out.
 */
export const ColumnChart = ({
	label,
	series,
	groups,
	size = "md",
	className,
}: ColumnChartProps): FunctionComponent => {
	const { width, gap } = COLUMN_SIZES[size];
	const scale = Math.max(
		1,
		...groups.flatMap((group) =>
			group.columns.map((column) => totalOf(column, series))
		)
	);
	const axis = AMOUNT_HEIGHT + PLOT_HEIGHT;
	return (
		<div className={joinClassNames("flex min-w-0 flex-col gap-3", className)}>
			{series.length > 1 && (
				<ul className={LEGEND_LIST_CLASSES}>
					{series.map((each) => (
						<li key={each.id} className={LEGEND_ITEM_CLASSES}>
							<span
								aria-hidden="true"
								className={joinClassNames(
									LEGEND_KEY_CLASSES,
									CHART_BACKGROUND_CLASSES[each.colour]
								)}
							/>
							{each.label}
						</li>
					))}
				</ul>
			)}
			<div className="flex flex-wrap gap-x-8 gap-y-4 overflow-x-auto">
				{groups.map((group) => {
					const count = group.columns.length;
					const chartWidth = Math.max(0, count * width + (count - 1) * gap);
					return (
						<figure key={group.id} className="flex flex-col gap-2">
							{group.title !== undefined && (
								<figcaption className="text-xs font-semibold text-neutral-900">
									{group.title}
								</figcaption>
							)}
							<svg
								aria-label={describe(label, group, series)}
								className="shrink-0"
								height={axis + LABEL_HEIGHT}
								role="img"
								width={chartWidth}
							>
								<line
									className="stroke-neutral-400"
									x1={0}
									x2={chartWidth}
									y1={axis}
									y2={axis}
								/>
								{group.columns.map((column, index) => {
									const left = index * (width + gap);
									const parts = partsOf(column, series, scale);
									const top = parts[parts.length - 1]?.top ?? axis;
									return (
										<g key={column.id}>
											{parts.map((part) => (
												<rect
													key={part.series.id}
													className={CHART_FILL_CLASSES[part.series.colour]}
													height={part.height}
													rx={2}
													width={width}
													x={left}
													y={part.top}
												/>
											))}
											<text
												className="fill-neutral-900 text-xs font-bold"
												textAnchor="middle"
												x={left + width / 2}
												y={top - 4}
											>
												{totalOf(column, series)}
											</text>
											<text
												className="fill-neutral-700 text-[0.625rem]"
												textAnchor="middle"
												x={left + width / 2}
												y={axis + 12}
											>
												{column.label}
											</text>
										</g>
									);
								})}
							</svg>
						</figure>
					);
				})}
			</div>
		</div>
	);
};
