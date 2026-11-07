import type { TFunction } from "i18next";
import {
	isWeekdays,
	paidShiftHours,
} from "@/features/scheduling/scheduleDraft";
import type { ScheduleShift } from "@/features/scheduling/schedules/api";

/** "09:00 – 15:00" */
export const formatTimeRange = (
	shift: Pick<ScheduleShift, "startTime" | "endTime">,
	t: TFunction
): string =>
	t("scheduling.timeRange", { start: shift.startTime, end: shift.endTime });

/** "11 h (60 min break)", or "6 h" for a shift with no unpaid break. */
export const formatPaidHours = (
	shift: Pick<ScheduleShift, "startTime" | "endTime" | "unpaidBreakMinutes">,
	t: TFunction
): string =>
	shift.unpaidBreakMinutes > 0
		? t("scheduling.shifts.paidHoursWithBreak", {
				hours: paidShiftHours(shift),
				minutes: shift.unpaidBreakMinutes,
			})
		: t("scheduling.shifts.paidHoursValue", { hours: paidShiftHours(shift) });

/** "Weekdays" for Monday to Friday, otherwise each day, e.g. "Mon, Wed, Fri". */
export const formatDays = (
	days: ScheduleShift["days"],
	t: TFunction
): string =>
	isWeekdays(days)
		? t("scheduling.days.weekdays")
		: days.map((day) => t(`scheduling.days.${day}`)).join(", ");
