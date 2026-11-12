import type { TFunction } from "i18next";
import { dayTypeLabel } from "@/features/scheduling/dayTypes";
import { formatTimeRange } from "@/features/scheduling/formatShift";
import type {
	RosterCellValue,
	ScheduleAssignment,
} from "@/features/scheduling/schedules/api";

type CellSource = Pick<
	ScheduleAssignment,
	"offReason" | "dayType" | "shift" | "jobTitle"
>;

/** Leave and absent keep their reason; any other day is worked or not by its shift. */
const kindOf = (assignment: CellSource): RosterCellValue["kind"] => {
	if (assignment.offReason === "LEAVE" || assignment.offReason === "ABSENT")
		return assignment.offReason;
	return assignment.shift === null ? "OFF" : "WORK";
};

/** What a roster row holds now, in the shape a change's "before" has. Pure. */
export const assignmentCell = (assignment: CellSource): RosterCellValue => ({
	kind: kindOf(assignment),
	dayType: assignment.dayType,
	shift: assignment.shift,
	jobTitle: assignment.jobTitle,
});

/**
 * A roster day in words, as the editor, the undo question and "Was:" show
 * it: "Front Desk AM · 09:00 – 15:00", the day's type ("Rest day"), "Day off"
 * without one, "Absent" or "On leave". Pure.
 */
export const rosterCellText = (cell: RosterCellValue, t: TFunction): string => {
	if (cell.kind === "LEAVE") return t("scheduling.rosterEdit.onLeave");
	if (cell.kind === "ABSENT") return t("scheduling.detail.absent");
	if (cell.shift === null)
		return cell.dayType === null
			? t("scheduling.rosterEdit.dayOff")
			: dayTypeLabel(cell.dayType, t);
	const time = formatTimeRange(
		{ startTime: cell.shift.startTime, endTime: cell.shift.endTime },
		t
	);
	return `${cell.shift.name} · ${time}`;
};
