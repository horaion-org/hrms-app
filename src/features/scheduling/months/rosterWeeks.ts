import type { TFunction } from "i18next";
import type {
	ScheduleMonth,
	WeekState,
} from "@/features/scheduling/months/api";
import type { RosterWeek } from "@/features/scheduling/roster/RosterWeekBar";
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
	return weekScheduleLink(
		{ scheduleId: week.scheduleId, state: week.state },
		month.departmentId
	);
};

/** Where a week's schedule opens, by its week state: a draft's setup, any other its roster. */
export const weekScheduleLink = (
	{ scheduleId, state }: { scheduleId: string; state: WeekState },
	departmentId: string
): ScheduleViewLink =>
	scheduleViewLink({
		scheduleId,
		departmentId,
		status: state === "DRAFT" ? "DRAFT" : "GENERATED",
	});

/** Whether a week's schedules are listed by their days: only when it holds more than one (API ADR-0113). */
export const listsWeekParts = (parts: ReadonlyArray<unknown>): boolean =>
	parts.length > 1;
