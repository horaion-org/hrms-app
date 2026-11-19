import { MINUTES_PER_DAY, minutesOfDay } from "@/common/timeOfDay";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";

/** What a group's summary reads of a shift. */
type GroupedShift = Pick<ScheduleShift, "shiftId" | "startTime" | "endTime">;

/** What a group heading says: how many shifts, the hours they span, how many are ticked, and whether one warns. */
export type ShiftGroupSummary = {
	count: number;
	startTime: string;
	endTime: string;
	chosen: number;
	warns: boolean;
};

/** How long a shift runs, in minutes; a shift ending at its start runs the whole day. */
const lengthOf = (shift: GroupedShift): number =>
	(minutesOfDay(shift.endTime) -
		minutesOfDay(shift.startTime) +
		MINUTES_PER_DAY) %
		MINUTES_PER_DAY || MINUTES_PER_DAY;

/**
 * A group's summary from its shifts in day order: it spans from the first
 * shift's start to the latest end after it (past midnight for a night group),
 * counts the ticked ones among `selectedIds`, and warns when any shift does.
 */
export const shiftGroupSummaryOf = <Shift extends GroupedShift>(
	shifts: ReadonlyArray<Shift>,
	selectedIds: ReadonlyArray<string>,
	warns: (shift: Shift) => boolean
): ShiftGroupSummary | undefined => {
	const first = shifts[0];
	if (!first) return undefined;
	const groupStart = minutesOfDay(first.startTime);
	// Each shift's end, counted in minutes from the group's start.
	const endAfterStart = (shift: Shift): number =>
		((minutesOfDay(shift.startTime) - groupStart + MINUTES_PER_DAY) %
			MINUTES_PER_DAY) +
		lengthOf(shift);
	const last = shifts.reduce((latest, shift) =>
		endAfterStart(shift) > endAfterStart(latest) ? shift : latest
	);
	return {
		count: shifts.length,
		startTime: first.startTime,
		endTime: last.endTime,
		chosen: shifts.filter((shift) => selectedIds.includes(shift.shiftId))
			.length,
		warns: shifts.some(warns),
	};
};
