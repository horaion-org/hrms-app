import type { TFunction } from "i18next";
import type { ScheduleMonth } from "@/features/scheduling/months/api";
import type { RosterWeek } from "@/features/scheduling/RosterWeekBar";
import {
	scheduleViewLink,
	type ScheduleViewLink,
} from "@/features/scheduling/schedules/scheduleViewLink";

/*
 * The roster page's week bar steps through the Department's weeks of the
 * schedule's month, the same weeks as the month page its back link goes to.
 */

/** The month's weeks as the week bar lists them: "16 – 22 Nov 2026 · Tentative", disabled without a schedule. */
export const rosterWeeksOf = (
	month: ScheduleMonth,
	t: TFunction
): Array<RosterWeek> =>
	month.weeks.map((week) => ({
		start: week.periodStart,
		end: week.periodEnd,
		state: t(`scheduling.months.states.${week.state}`),
		disabled: week.scheduleId === null,
	}));

/** Where choosing a week goes: its roster, or a draft's setup; undefined for a week without a schedule. */
export const rosterWeekLink = (
	month: ScheduleMonth,
	weekStart: string
): ScheduleViewLink | undefined => {
	const week = month.weeks.find((each) => each.periodStart === weekStart);
	if (!week?.scheduleId) return undefined;
	return scheduleViewLink({
		scheduleId: week.scheduleId,
		departmentId: month.departmentId,
		// Only a draft opens elsewhere (its setup); every other week opens its roster.
		status: week.state === "DRAFT" ? "DRAFT" : "GENERATED",
	});
};
