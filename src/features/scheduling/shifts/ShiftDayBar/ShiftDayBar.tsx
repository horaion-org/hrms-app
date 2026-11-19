import type { FunctionComponent } from "@/common/types";
import {
	dayBarOf,
	type DayAxis,
	type TimedShift,
} from "@/features/scheduling/shifts/shiftDayAxis";

export type ShiftDayBarProps = {
	shift: TimedShift;
	/** The axis every bar of the list shares, so overlaps line up. */
	axis: DayAxis;
};

/**
 * When a shift runs, drawn as a bar on the day axis its list shares. It
 * always fills its container's width, with the same floor as ShiftDayAxis,
 * so a bar and the hours above it share one scale wherever both sit. It is decorative: the
 * shift's times are always written beside it.
 */
export const ShiftDayBar = ({
	shift,
	axis,
}: ShiftDayBarProps): FunctionComponent => {
	const bar = dayBarOf(shift, axis);
	return (
		<span
			aria-hidden="true"
			className="relative block h-4 w-full min-w-32 rounded-xs bg-neutral-200"
			data-testid="shift-day-track"
		>
			<span
				className="absolute inset-y-0.5 rounded-xs border border-ink-blue-700 bg-ink-blue-200"
				data-testid="shift-day-bar"
				style={{ left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
			/>
		</span>
	);
};
