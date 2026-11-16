import dayjs from "dayjs";
import { mondayOf } from "@/common/weeks";
import type { DayRange, MonthSpan } from "@/features/dashboard/api";

/*
 * The fixed time ranges the dashboard's cards read, worked out from today,
 * and how the cards write a number of hours.
 */

const ISO_DAY = "YYYY-MM-DD";
const ISO_MONTH = "YYYY-MM";
/** Two weeks, Monday of this week to Sunday of next. */
const DAYS_IN_TWO_WEEKS = 14;
const MINUTES_IN_AN_HOUR = 60;

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

/** Today alone, as a range: the day Home counts who is off. */
export const todayOnly = (today: Date): DayRange => ({
	from: isoDay(today),
	to: isoDay(today),
});

/** How far ahead Home looks for who joins, ends probation or leaves, today included. */
export const PEOPLE_EVENTS_DAYS = 30;

/** Today and the days after it that Home lists people events for. */
export const comingPeopleDays = (today: Date): DayRange => ({
	from: isoDay(today),
	to: dayjs(today)
		.add(PEOPLE_EVENTS_DAYS - 1, "day")
		.format(ISO_DAY),
});

/** The months this month and next, as the month summaries read them. */
export const thisAndNextMonth = (today: Date): MonthSpan => ({
	from: dayjs(today).format(ISO_MONTH),
	to: dayjs(today).add(1, "month").format(ISO_MONTH),
});

/** Minutes as hours, at most one decimal, e.g. 4500 as "75". */
export const hoursLabel = (minutes: number, language: string): string =>
	new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(
		minutes / MINUTES_IN_AN_HOUR
	);

/** The Monday of next week: the coming period a roster is made for. */
export const nextMonday = (today: Date): string =>
	dayjs(mondayOf(today)).add(1, "week").format(ISO_DAY);
