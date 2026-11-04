import dayjs from "dayjs";

/** Where a week sits next to today's: the one before it, its own, or the one after. */
export type RelativeWeek = "last" | "this" | "next";

/**
 * A week-long Schedule period, Monday to Sunday, as ISO dates. `relative`
 * names last, this or next week; `started` is set once its Monday has passed.
 */
export type SchedulePeriod = {
	start: string;
	end: string;
	relative?: RelativeWeek;
	started?: boolean;
};

/** How many weeks before this one the Setup period select offers. */
export const PAST_WEEKS = 2;

/** How many weeks after this one the Setup period select offers. */
export const FUTURE_WEEKS = 10;

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

/** The Monday of the week `today` falls in, at the start of its day. */
const mondayOf = (today: Date): dayjs.Dayjs =>
	dayjs(today)
		.startOf("day")
		.subtract((today.getDay() + 6) % 7, "day");

const RELATIVE_WEEKS: Record<number, RelativeWeek> = {
	[-1]: "last",
	0: "this",
	1: "next",
};

/** The period starting on `start`, told where it sits next to `today`'s week. */
const placedPeriod = (start: string, today: Date): SchedulePeriod => {
	// Rounded, so a daylight-saving hour between the two Mondays does not shift it.
	const weeksFromThis = Math.round(
		dayjs(start).diff(mondayOf(today), "day", true) / 7
	);
	const relative = RELATIVE_WEEKS[weeksFromThis];
	return {
		...periodStartingOn(start),
		...(relative ? { relative } : {}),
		...(dayjs(start).isBefore(dayjs(today).startOf("day"))
			? { started: true }
			: {}),
	};
};

/**
 * The weeks the Setup period select offers: `weeksBack` weeks before the
 * week `today` falls in, that week, and `weeksAhead` weeks after it.
 */
export const selectablePeriods = (
	today: Date,
	{ weeksBack = PAST_WEEKS, weeksAhead = FUTURE_WEEKS } = {}
): Array<SchedulePeriod> => {
	const firstMonday = mondayOf(today).subtract(weeksBack, "week");
	return Array.from({ length: weeksBack + 1 + weeksAhead }, (_, week) =>
		placedPeriod(firstMonday.add(week, "week").format(isoFormat), today)
	);
};

/** The week a new schedule starts on: the next Monday's, or today's when it is one. */
export const defaultPeriod = (today: Date): SchedulePeriod => {
	const daysToMonday = (8 - today.getDay()) % 7;
	return placedPeriod(
		dayjs(today).add(daysToMonday, "day").format(isoFormat),
		today
	);
};

/**
 * `periods` with the week starting on `start` among them in date order, e.g.
 * a reopened draft's week that has passed out of the offered ones.
 */
export const withPeriod = (
	periods: Array<SchedulePeriod>,
	start: string,
	today: Date
): Array<SchedulePeriod> =>
	periods.some((period) => period.start === start)
		? periods
		: [...periods, placedPeriod(start, today)].sort((first, second) =>
				first.start.localeCompare(second.start)
			);

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

/** An ISO date as a short day in the person's language, e.g. "Mon, 12 Oct". */
export const formatDay = (date: string, language: string): string =>
	new Intl.DateTimeFormat(language, {
		weekday: "short",
		day: "numeric",
		month: "short",
	}).format(dayjs(date).toDate());
