import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { rosterLooks } from "@/features/scheduling/rosterLooks";
import type { RosterShift as Shift } from "@/features/scheduling/schedules";

export type RosterShiftProps = {
	shift: Shift;
	/** Names the shift for assistive tech, e.g. "John Lim, Mon 09:00 – 18:00". */
	label: string;
	/** "09:00 – 18:00" */
	timeRange: string;
	selected: boolean;
	onSelect: () => void;
};

/** One shift in a roster cell; choosing it shows its details. */
export const RosterShift = ({
	shift,
	label,
	timeRange,
	selected,
	onSelect,
}: RosterShiftProps): FunctionComponent => (
	<button
		aria-label={label}
		aria-pressed={selected}
		type="button"
		className={joinClassNames(
			"block w-full min-w-0 cursor-pointer rounded border px-3 py-2 text-left text-xs font-medium hover:brightness-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500",
			rosterLooks[shift.kind],
			selected && "ring-2 ring-success-600 ring-inset"
		)}
		onClick={onSelect}
	>
		<span className="block truncate">{timeRange}</span>
		<span className="mt-1 block truncate">{shift.role}</span>
	</button>
);
