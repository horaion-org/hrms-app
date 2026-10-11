import dayjs from "dayjs";

/** A week-long Schedule period, Monday to Sunday, as ISO dates. */
export type SchedulePeriod = { start: string; end: string };

const isoFormat = "YYYY-MM-DD";

/** `formatRange` is ES2021, past the ES2020 lib this project compiles against. */
type RangeFormat = Intl.DateTimeFormat & {
	formatRange: (start: Date, end: Date) => string;
};

/** The period starting on `start`, e.g. one chosen earlier. */
export const periodStartingOn = (start: string): SchedulePeriod => ({
	start,
	end: dayjs(start).add(6, "day").format(isoFormat),
});

/** The next `count` weeks, starting with the week of the next Monday (today, if it is one). */
export const upcomingPeriods = (
	today: Date,
	count = 3
): Array<SchedulePeriod> => {
	const daysToMonday = (8 - today.getDay()) % 7;
	const firstMonday = dayjs(today).add(daysToMonday, "day");
	return Array.from({ length: count }, (_, week) =>
		periodStartingOn(firstMonday.add(week, "week").format(isoFormat))
	);
};

/** The period's dates as a range in the person's language, e.g. "13 – 19 Apr 2026". */
export const formatPeriod = (
	period: SchedulePeriod,
	language: string
): string =>
	(
		new Intl.DateTimeFormat(language, {
			day: "numeric",
			month: "short",
			year: "numeric",
		}) as RangeFormat
	).formatRange(dayjs(period.start).toDate(), dayjs(period.end).toDate());
