import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import type { RosterShiftCell } from "@/features/scheduling/roster/roster";
import {
	CELL_MARK_TITLE_KEYS,
	type CellMark,
} from "@/features/scheduling/roster/rosterMarks";
import {
	cellMarkLooks,
	shiftTileStyle,
} from "@/features/scheduling/rosterLooks";

export type RosterShiftProps = {
	/** A worked day: its frozen shift and the role it is worked as. */
	shift: RosterShiftCell;
	/** Names the shift for assistive tech, e.g. "John Lim, Mon 09:00 – 18:00", with what its mark means. */
	label: string;
	/** "09:00 – 18:00" */
	timeRange: string;
	selected: boolean;
	onSelect: () => void;
	/** The tile's one mark (`cellMark`); none without. The label says what it means. */
	mark?: CellMark;
	/** False when the role repeats the member's job title in the row header (`showsRole`). */
	showsRole?: boolean;
	/** A line of the member's own, e.g. "Leave requested" (`tileStatusKey`). */
	status?: string;
};

/**
 * One shift in a roster cell, on its shift's colour: its time first and in
 * full, as a manager reads it first, then its name and, when it says
 * something the row header doesn't, its role; both may be cut short in a
 * narrow cell (the label names the day in full). Its one mark sits in its
 * top-right corner. Choosing it shows its details.
 */
export const RosterShift = ({
	shift,
	label,
	timeRange,
	selected,
	onSelect,
	mark,
	showsRole = true,
	status,
}: RosterShiftProps): FunctionComponent => {
	const { t } = useTranslation();
	return (
		<button
			aria-label={label}
			aria-pressed={selected}
			style={shiftTileStyle(shift.colour)}
			type="button"
			className={joinClassNames(
				"relative block w-full min-w-0 cursor-pointer rounded border px-2 py-2 text-left text-xs font-medium text-neutral-900 hover:brightness-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500",
				mark && "pr-4",
				selected && "ring-2 ring-success-600 ring-inset"
			)}
			onClick={onSelect}
		>
			{mark && (
				<span
					aria-hidden="true"
					className={cellMarkLooks[mark]}
					title={t(CELL_MARK_TITLE_KEYS[mark])}
				/>
			)}
			<span className="block font-semibold text-balance tabular-nums">
				{timeRange}
			</span>
			<span className="mt-1 block truncate">{shift.name}</span>
			{showsRole && <span className="block truncate">{shift.role}</span>}
			{status && <span className="block truncate">{status}</span>}
		</button>
	);
};
