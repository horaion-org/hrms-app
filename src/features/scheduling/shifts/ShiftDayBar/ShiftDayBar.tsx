import { joinClassNames } from "@/common/joinClassNames";
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
	className?: string;
};

/**
 * When a shift runs, drawn as a bar on the day axis its list shares. It is
 * decorative: the shift's times are always written beside it.
 */
export const ShiftDayBar = ({
	shift,
	axis,
	className,
}: ShiftDayBarProps): FunctionComponent => {
	const bar = dayBarOf(shift, axis);
	return (
		<span
			aria-hidden="true"
			className={joinClassNames(
				"relative block h-4 w-54 max-w-full rounded-xs bg-neutral-200",
				className
			)}
		>
			<span
				className="absolute inset-y-0.5 rounded-xs border border-ink-blue-700 bg-ink-blue-200"
				data-testid="shift-day-bar"
				style={{ left: `${bar.leftPercent}%`, width: `${bar.widthPercent}%` }}
			/>
		</span>
	);
};
