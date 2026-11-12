import dayjs from "dayjs";
import { mondayOf } from "@/common/weeks";
import type {
	MonthRange,
	ScheduleMonthSummary,
	WeekState,
} from "@/features/scheduling/months/api";
import type { SchedulePeriod } from "@/features/scheduling/periods";

/*
 * Months as "yyyy-MM", pure. A week belongs to the month its Monday falls
 * in, as the API places it.
 */

/** How many months after this week's month the Schedules tab asks for. */
export const MONTHS_AHEAD = 12;

/** The month a week belongs to: its Monday's, e.g. "2026-11" for 30 Nov – 6 Dec. */
export const monthOf = (monday: string): string => monday.slice(0, 7);

/** The month `by` months after `month` (before, when negative). */
export const shiftMonth = (month: string, by: number): string =>
	dayjs(`${month}-01`).add(by, "month").format("YYYY-MM");

/** What the Schedules tab asks for: from the month of this week's Monday to 12 months after it. */
export const summaryRange = (today: Date): MonthRange => {
	const from = monthOf(mondayOf(today));
	return { from, to: shiftMonth(from, MONTHS_AHEAD) };
};

/** A month in the person's language, e.g. "November 2026". */
export const formatMonth = (month: string, language: string): string =>
	new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(
		dayjs(`${month}-01`).toDate()
	);

/** A date's day and month in the person's language, e.g. "16 Nov". */
export const formatDayAndMonth = (date: string, language: string): string =>
	new Intl.DateTimeFormat(language, { day: "numeric", month: "short" }).format(
		dayjs(date).toDate()
	);

/** A month's name alone in the person's language, e.g. "November". */
export const formatMonthName = (month: string, language: string): string =>
	new Intl.DateTimeFormat(language, { month: "long" }).format(
		dayjs(`${month}-01`).toDate()
	);

/** How many weeks are in each state; weeks not generated yet are left out. */
export const stateCounts = (
	weeks: ReadonlyArray<{ state: WeekState }>
): Partial<Record<WeekState, number>> => {
	const counts: Partial<Record<WeekState, number>> = {};
	for (const { state } of weeks) {
		if (state !== "NOT_GENERATED") counts[state] = (counts[state] ?? 0) + 1;
	}
	return counts;
};

/** `formatRange` is ES2021, past the ES2020 lib this project compiles against. */
type RangeFormat = Intl.DateTimeFormat & {
	formatRange: (start: Date, end: Date) => string;
};

/** A week's dates without the year, as the month page names a week, e.g. "16 – 22 Nov". */
export const formatWeekDates = (
	week: { start: string; end: string },
	language: string
): string =>
	(
		new Intl.DateTimeFormat(language, {
			day: "numeric",
			month: "short",
		}) as RangeFormat
	).formatRange(dayjs(week.start).toDate(), dayjs(week.end).toDate());

/**
 * The week that starts in the month before and ends in this one, shown on
 * its Monday's month only; undefined when the month starts on a Monday.
 */
export const crossingWeekOf = (month: string): SchedulePeriod | undefined => {
	const first = `${month}-01`;
	const monday = mondayOf(first);
	if (monday === first) return undefined;
	return {
		start: monday,
		end: dayjs(monday).add(6, "day").format("YYYY-MM-DD"),
	};
};

/**
 * For a month with tentative weeks, the earlier month whose week is under
 * review for the same Department, which comes first; undefined otherwise.
 */
export const earlierReviewMonth = (
	summaries: ReadonlyArray<ScheduleMonthSummary>,
	summary: ScheduleMonthSummary
): string | undefined => {
	if (!summary.weeks.some((week) => week.state === "TENTATIVE"))
		return undefined;
	const reviewing = summaries.find(
		(candidate) =>
			candidate.departmentId === summary.departmentId &&
			candidate.weeks.some((week) => week.state === "TO_REVIEW")
	);
	return reviewing && reviewing.month < summary.month
		? reviewing.month
		: undefined;
};

/** The summaries grouped by month, earliest first; within a month, in the API's order (Branch, then Department). */
export const summariesByMonth = (
	summaries: ReadonlyArray<ScheduleMonthSummary>
): Array<[string, Array<ScheduleMonthSummary>]> => {
	const months = new Map<string, Array<ScheduleMonthSummary>>();
	for (const summary of summaries) {
		months.set(summary.month, [...(months.get(summary.month) ?? []), summary]);
	}
	return [...months.entries()].sort(([first], [second]) =>
		first.localeCompare(second)
	);
};
