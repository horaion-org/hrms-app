/*
 * Monday-first calendar weeks as ISO dates, shared by scheduling and
 * availability: the Monday of a date, a period's weeks and a week's days.
 */
import dayjs, { type Dayjs } from "dayjs";

/** A span of whole days as ISO dates, both ends included. */
export type DateRange = { start: string; end: string };

const iso = (day: Dayjs): string => day.format("YYYY-MM-DD");

/** The Monday on or before `date`. */
export const mondayOf = (date: Date | string): string => {
	const day = dayjs(date);
	return iso(day.subtract((day.day() + 6) % 7, "day"));
};

/** Each week-long range within `range`, Monday first. */
export const weeksOf = (range: DateRange): Array<DateRange> => {
	const weeks: Array<DateRange> = [];
	for (
		let start = dayjs(mondayOf(range.start));
		!start.isAfter(range.end, "day");
		start = start.add(1, "week")
	)
		weeks.push({ start: iso(start), end: iso(start.add(6, "day")) });
	return weeks;
};

/** The seven dates of the week starting on `monday`. */
export const daysOf = (monday: string): Array<string> =>
	Array.from({ length: 7 }, (_, offset) =>
		iso(dayjs(monday).add(offset, "day"))
	);
