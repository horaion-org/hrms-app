import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import {
	CHART_BACKGROUND_CLASSES,
	LEGEND_ITEM_CLASSES,
	LEGEND_KEY_CLASSES,
	LEGEND_LIST_CLASSES,
	type ChartSeries,
} from "@/components/charts/chartColours";

/** One part of the bar: a series and how much of it there is. */
export type BarSegment = ChartSeries & { value: number };

export type SegmentedBarProps = {
	/** What the bar measures, e.g. "Changes after publishing, North Point". */
	label: string;
	/** The parts, in the order drawn; a part of 0 takes no room. */
	segments: ReadonlyArray<BarSegment>;
	/**
	 * What the whole track stands for. Left out, the parts fill the track;
	 * set to the largest of several bars' totals, the bars compare by length.
	 */
	scaleTo?: number;
	/** Names each part above the bar, 0 included, so one bar can carry the legend for those under it. */
	legend?: boolean;
	className?: string;
};

/** The label read out for the bar: what it measures, then each part's name and amount. */
const describe = (label: string, segments: ReadonlyArray<BarSegment>): string =>
	`${label}: ${segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}`;

/**
 * One horizontal bar split into parts, such as changes by reason or
 * rosters by state. The parts and their amounts are read out, so colour is
 * never the only way to tell them apart.
 */
export const SegmentedBar = ({
	label,
	segments,
	scaleTo,
	legend = false,
	className,
}: SegmentedBarProps): FunctionComponent => {
	const total = segments.reduce((sum, segment) => sum + segment.value, 0);
	const scale = Math.max(scaleTo ?? total, total);
	return (
		<div className={joinClassNames("flex min-w-0 flex-col gap-2", className)}>
			{legend && (
				<ul className={LEGEND_LIST_CLASSES}>
					{segments.map((segment) => (
						<li key={segment.id} className={LEGEND_ITEM_CLASSES}>
							<span
								aria-hidden="true"
								className={joinClassNames(
									LEGEND_KEY_CLASSES,
									CHART_BACKGROUND_CLASSES[segment.colour]
								)}
							/>
							{segment.label}
						</li>
					))}
				</ul>
			)}
			<div
				aria-label={describe(label, segments)}
				className="flex h-2 overflow-hidden rounded-full bg-neutral-300"
				role="img"
			>
				{scale > 0 &&
					segments
						.filter((segment) => segment.value > 0)
						.map((segment) => (
							<div
								key={segment.id}
								className={CHART_BACKGROUND_CLASSES[segment.colour]}
								style={{ width: `${(segment.value / scale) * 100}%` }}
							/>
						))}
			</div>
		</div>
	);
};
