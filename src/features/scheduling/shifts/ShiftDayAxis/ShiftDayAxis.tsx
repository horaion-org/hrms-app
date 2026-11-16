import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import {
	dayAxisTicksOf,
	type DayAxis,
} from "@/features/scheduling/shifts/shiftDayAxis";

/** Hours between the labels where there is room, as in a dialog. */
const DEFAULT_STEP_HOURS = 3;

export type ShiftDayAxisProps = {
	axis: DayAxis;
	/** What the axis is named, as the column it heads. */
	label: string;
	/** Hours between the labels; fewer labels where the axis is narrow, as in a list column. */
	stepHours?: number;
};

/** Where a label sits on its hour: the first starts there, the last ends there, the rest are centred. */
const labelAlignment = (index: number, count: number): string | undefined => {
	if (index === 0) return undefined;
	if (index === count - 1) return "-translate-x-full";
	return "-translate-x-1/2";
};

/**
 * The hours along the day axis, at the head of the ShiftDayBars it lines up
 * with. It always fills its container's width, as each ShiftDayBar does, so
 * an hour's label and a bar's edge at that hour sit at the same fraction of
 * one width. The end labels stay inside the axis. Screen readers hear its
 * label alone.
 */
export const ShiftDayAxis = ({
	axis,
	label,
	stepHours = DEFAULT_STEP_HOURS,
}: ShiftDayAxisProps): FunctionComponent => {
	const ticks = dayAxisTicksOf(axis, stepHours);
	return (
		<span
			className="relative block h-4 w-full min-w-32"
			data-testid="shift-day-axis"
		>
			<span className="sr-only">{label}</span>
			{ticks.map((tick, index) => (
				<span
					key={tick.percent}
					aria-hidden="true"
					className={joinClassNames(
						"absolute top-0 text-xs font-medium text-neutral-700",
						labelAlignment(index, ticks.length)
					)}
					style={{ left: `${tick.percent}%` }}
				>
					{tick.label}
				</span>
			))}
		</span>
	);
};
