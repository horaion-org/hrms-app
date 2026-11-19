import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Badge } from "@/components/ui/Badge";
import type { RosterShiftCell } from "@/features/scheduling/roster/roster";
import {
	CELL_MARK_TITLE_KEYS,
	type CellMark,
	overtimePills,
} from "@/features/scheduling/roster/rosterMarks";
import {
	cellMarkLooks,
	shiftTileStyle,
} from "@/features/scheduling/roster/rosterLooks";
import { stretchHoursMark } from "@/features/scheduling/roster/stretchWords";

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
	/** A line under the role: the member's own leave ("Leave requested") or the day type the shift falls on (`tileStatus`). */
	status?: string;
	/** Beside an open panel: the time only; the label and the panel name the rest. */
	compact?: boolean;
};

/**
 * One shift in a roster cell, on its shift's colour: its time first and in
 * full, as a manager reads it first, then its name and, when it says
 * something the row header doesn't, its role, then its status; each may be
 * cut short in a narrow cell (the label names the day in full, and the
 * status shows whole on hover). A shift stretched into overtime shows a
 * warning pill per side under them, "+OT 21:00 – 23:00", as v1 marked an
 * applied stretch, and "+2 h" beside its time, also beside an open panel; the
 * status already says it for assistive tech. Beside an open panel it shows
 * its time only. Its one mark sits in its top-right
 * corner. Choosing it shows its details.
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
	compact = false,
}: RosterShiftProps): FunctionComponent => {
	const { t } = useTranslation();
	const pills = overtimePills(shift, t);
	const stretchMark = stretchHoursMark(shift.stretchMinutes, t);
	return (
		<button
			aria-label={label}
			aria-pressed={selected}
			style={shiftTileStyle(shift.colour)}
			type="button"
			className={joinClassNames(
				"relative w-full min-w-0 cursor-pointer rounded border text-left text-xs font-medium text-neutral-900 hover:brightness-98 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-blue-500",
				// Beside an open panel, the time alone on up to two lines, as tall as an Off or Leave tile.
				compact ? "flex h-10 items-center px-1.5" : "block px-2 py-2",
				mark && (compact ? "pr-3.5" : "pr-4"),
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
				{stretchMark && (
					<span aria-hidden="true" className="ml-1 text-warning-900">
						{stretchMark}
					</span>
				)}
			</span>
			{!compact && (
				<>
					<span className="mt-1 block truncate">{shift.name}</span>
					{showsRole && <span className="block truncate">{shift.role}</span>}
					{status && (
						// Cut short in a narrow cell; hovering shows it whole, as the mark's title does.
						<span className="block truncate" title={status}>
							{status}
						</span>
					)}
					{pills.length > 0 && (
						<span aria-hidden="true" className="mt-1 flex flex-wrap gap-1">
							{pills.map((pill) => (
								<Badge key={pill} compact tone="warning">
									{pill}
								</Badge>
							))}
						</span>
					)}
				</>
			)}
		</button>
	);
};
