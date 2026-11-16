import dayjs from "dayjs";
import { mondayOf } from "@/common/weeks";
import type { DayRange, MonthSpan } from "@/features/dashboard/api";

/*
 * The fixed time ranges the dashboard's cards read, worked out from today.
 * Each card says its range in its own words.
 */

const ISO_DAY = "YYYY-MM-DD";
const ISO_MONTH = "YYYY-MM";
/** Two weeks, Monday of this week to Sunday of next. */
const DAYS_IN_TWO_WEEKS = 14;

/** Today as an ISO date, in the browser's time zone. */
export const isoDay = (date: Date): string => dayjs(date).format(ISO_DAY);

/** This week and next: Monday of this week to Sunday of next week. */
export const thisAndNextWeek = (today: Date): DayRange => {
	const monday = mondayOf(today);
	return {
		from: monday,
		to: dayjs(monday)
			.add(DAYS_IN_TWO_WEEKS - 1, "day")
			.format(ISO_DAY),
	};
};

/** Today and tomorrow. */
export const todayAndTomorrow = (today: Date): DayRange => ({
	from: isoDay(today),
	to: dayjs(today).add(1, "day").format(ISO_DAY),
});

/** This calendar month, as a span of one month. */
export const thisMonth = (today: Date): MonthSpan => {
	const month = dayjs(today).format(ISO_MONTH);
	return { from: month, to: month };
};

/** The months this month and next, as the month summaries read them. */
export const thisAndNextMonth = (today: Date): MonthSpan => ({
	from: dayjs(today).format(ISO_MONTH),
	to: dayjs(today).add(1, "month").format(ISO_MONTH),
});

/** The Monday of next week: the coming period a roster is made for. */
export const nextMonday = (today: Date): string =>
	dayjs(mondayOf(today)).add(1, "week").format(ISO_DAY);
