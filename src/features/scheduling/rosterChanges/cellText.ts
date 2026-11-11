import type { TFunction } from "i18next";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import type {
	RosterCellValue,
	ScheduleAssignment,
} from "@/features/scheduling/schedules/api";

/** What a roster row holds now, in the shape a change's "before" has. Pure. */
export const assignmentCell = (
	assignment: Pick<
		ScheduleAssignment,
		"offReason" | "dayType" | "shift" | "jobTitle"
	>
): RosterCellValue => ({
	kind:
		assignment.offReason === "LEAVE"
			? "LEAVE"
			: assignment.shift === null
				? "OFF"
				: "WORK",
	dayType: assignment.dayType,
	shift: assignment.shift,
	jobTitle: assignment.jobTitle,
});

/**
 * A roster day in words, as the editor, the undo question and "Was:" show
 * it: "Front Desk AM · 09:00 – 15:00", "Day off" or "On leave". Pure.
 */
export const rosterCellText = (cell: RosterCellValue, t: TFunction): string => {
	if (cell.kind === "LEAVE") return t("scheduling.rosterEdit.onLeave");
	if (cell.shift === null) return t("scheduling.rosterEdit.dayOff");
	const time = formatTimeRange(
		{ startTime: cell.shift.startTime, endTime: cell.shift.endTime },
		t
	);
	return `${cell.shift.name} · ${time}`;
};
