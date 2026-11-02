import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { RosterShiftCell } from "@/features/scheduling/roster/roster";
import { shiftTileStyle } from "@/features/scheduling/rosterLooks";

export type RosterShiftProps = {
	/** A worked day: its frozen shift and the role it is worked as. */
	shift: RosterShiftCell;
	/** Names the shift for assistive tech, e.g. "John Lim, Mon 09:00 – 18:00". */
	label: string;
	/** "09:00 – 18:00" */
	timeRange: string;
	selected: boolean;
	onSelect: () => void;
};

/**
 * One shift in a roster cell, on its shift's colour: its name, role and
 * time. Choosing it shows its details.
 */
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
		style={shiftTileStyle(shift.colour)}
		type="button"
		className={joinClassNames(
			"block w-full min-w-0 cursor-pointer rounded border px-3 py-2 text-left text-xs font-medium text-neutral-900 hover:brightness-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500",
			selected && "ring-2 ring-success-600 ring-inset"
		)}
		onClick={onSelect}
	>
		<span className="block truncate font-semibold">{shift.name}</span>
		<span className="mt-1 block truncate">{shift.role}</span>
		<span className="block truncate">{timeRange}</span>
	</button>
);
