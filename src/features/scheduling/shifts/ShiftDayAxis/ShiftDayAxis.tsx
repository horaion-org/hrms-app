import type { FunctionComponent } from "@/common/types";
import {
	dayAxisTicksOf,
	type DayAxis,
} from "@/features/scheduling/shifts/shiftDayAxis";

/** Hours between the axis's labels. */
const TICK_STEP_HOURS = 3;

export type ShiftDayAxisProps = {
	axis: DayAxis;
	/** What the axis is named, as the column it heads. */
	label: string;
};

/**
 * The hours along the day axis, every three, at the head of the column of
 * ShiftDayBars it lines up with; screen readers hear its label alone.
 */
export const ShiftDayAxis = ({
	axis,
	label,
}: ShiftDayAxisProps): FunctionComponent => (
	<span className="relative block h-4 w-54 max-w-full">
		<span className="sr-only">{label}</span>
		{dayAxisTicksOf(axis, TICK_STEP_HOURS).map((tick) => (
			<span
				key={tick.percent}
				aria-hidden="true"
				className="absolute top-0 -translate-x-1/2 text-[0.625rem] leading-3 font-medium text-neutral-700"
				style={{ left: `${tick.percent}%` }}
			>
				{tick.label}
			</span>
		))}
	</span>
);
