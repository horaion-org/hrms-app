import dayjs from "dayjs";
import type { OpeningBalances } from "@/features/scheduling/hours/api";
import type {
	MonthWeek,
	ScheduleMonth,
} from "@/features/scheduling/months/api";

/*
 * What a roster's opening balances add up to, pure: how many people's hours
 * earlier in the month are still unknown, the days those hours cover, and
 * which week of a month they are entered on.
 */

/** People whose hours before the roster are neither entered nor covered by rosters. */
export const unknownOpeningCount = (openings: OpeningBalances): number =>
	openings.members.filter(
		(member) => !member.rosteredBefore && member.workedMinutes === null
	).length;

/** The last day an opening covers: the day before the roster's first. */
export const lastDayBefore = (asOf: string): string =>
	dayjs(asOf).subtract(1, "day").format("YYYY-MM-DD");

/** Whether a roster starting on this day has days of its month before it (the API's `applies`). */
export const startsAfterFirst = (periodStart: string): boolean =>
	dayjs(periodStart).date() !== 1;

/**
 * The week of a month its earlier hours are entered on: its first week with a
 * schedule, when that week starts after the 1st; none otherwise.
 */
export const openingWeekOf = (month: ScheduleMonth): MonthWeek | undefined => {
	const first = month.weeks.find((week) => week.scheduleId !== null);
	return first && startsAfterFirst(first.periodStart) ? first : undefined;
};
