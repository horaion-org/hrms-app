import dayjs from "dayjs";
import "dayjs/locale/es";
import {
	calendarWeekCount,
	calendarWeekLength,
	type CalendarProps,
	type CalendarView,
	type DateRange,
	type IsoDate,
	type RangePosition,
} from "@/components/forms/Calendar/Calendar.constants";

type CalendarDay = {
	date: IsoDate;
	label: string;
	day: string;
	weekend: boolean;
	outsideMonth: boolean;
};

type Weekday = { label: string; shortLabel: string; weekend: boolean };

const isoFormat = "YYYY-MM-DD";
const localeFor = (language: string): string =>
	language.split("-")[0] === "es" ? "es" : "en";

/** Day first in every language, e.g. "22 Mar 1987"; month names are localised. */
export const formatDate = (date: IsoDate, language: string): string =>
	dayjs(date).locale(localeFor(language)).format("D MMM YYYY");

export const isDayDisabled = (
	date: IsoDate,
	{
		minDate,
		maxDate,
		isDateDisabled,
	}: Pick<CalendarProps, "minDate" | "maxDate" | "isDateDisabled">
): boolean =>
	Boolean(
		(minDate && date < minDate) ||
		(maxDate && date > maxDate) ||
		isDateDisabled?.(date)
	);

/** ISO calendar dates sort chronologically without timezone conversion. */
export const dateRange = (first: IsoDate, second: IsoDate): DateRange =>
	first <= second
		? { start: first, end: second }
		: { start: second, end: first };

export const rangePosition = (
	date: IsoDate,
	range?: DateRange | null
): RangePosition | undefined => {
	if (!range || date < range.start || date > range.end) return undefined;
	if (date === range.start && date === range.end) return "start-end";
	if (date === range.start) return "start";
	if (date === range.end) return "end";
	return "middle";
};

export const todayDate = (now: number): IsoDate => dayjs(now).format(isoFormat);

export const initialFocusDate = (
	month: IsoDate,
	selected: IsoDate | null | undefined,
	today: IsoDate
): IsoDate => {
	if (selected) return selected;
	const first = dayjs(month).startOf("month");
	const start = first.subtract((first.day() + 6) % calendarWeekLength, "day");
	const end = start.add(calendarWeekCount * calendarWeekLength - 1, "day");
	return today >= start.format(isoFormat) && today <= end.format(isoFormat)
		? today
		: first.format(isoFormat);
};

export const pageMonth = (month: IsoDate, direction: -1 | 1): IsoDate =>
	dayjs(month).startOf("month").add(direction, "month").format(isoFormat);

const yearBlockLength = 12;
const yearBlockAnchor = 2015;
const yearBlockStart = (month: IsoDate): number =>
	yearBlockAnchor +
	Math.floor((dayjs(month).year() - yearBlockAnchor) / yearBlockLength) *
		yearBlockLength;

type CalendarPeriodUnit = "month" | "year" | "year-block";

/** Focus may visit disabled cells without leaving the displayed period. */
export const isSamePeriod = (
	first: IsoDate,
	second: IsoDate,
	period: CalendarPeriodUnit
): boolean =>
	period === "year-block"
		? yearBlockStart(first) === yearBlockStart(second)
		: dayjs(first).isSame(dayjs(second), period);

/** Bounds-only overlap for cells and paging (including keyboard paging). */
export const isPeriodAvailable = (
	date: IsoDate,
	period: CalendarPeriodUnit,
	{ minDate, maxDate }: Pick<CalendarProps, "minDate" | "maxDate"> = {}
): boolean => {
	if (minDate && maxDate && minDate > maxDate) return false;
	const first =
		period === "year-block"
			? dayjs(date).startOf("year").year(yearBlockStart(date))
			: dayjs(date).startOf(period);
	const last =
		period === "year-block"
			? first.add(yearBlockLength - 1, "year").endOf("year")
			: first.endOf(period);
	return (
		(!minDate || last.format(isoFormat) >= minDate) &&
		(!maxDate || first.format(isoFormat) <= maxDate)
	);
};

export const keyboardDate = (
	date: IsoDate,
	view: CalendarView,
	key: string,
	shift: boolean
): IsoDate | null => {
	const current = dayjs(date);
	const unit = view === "days" ? "day" : view === "months" ? "month" : "year";
	const columns = view === "days" ? 7 : 4;
	const column =
		view === "days"
			? (current.day() + 6) % 7
			: view === "months"
				? current.month() % 4
				: (current.year() - yearBlockStart(date)) % 4;
	const pageUnit = view === "days" && !shift ? "month" : "year";
	const pageSize = view === "years" ? yearBlockLength : 1;
	switch (key) {
		case "ArrowLeft":
			return current.subtract(1, unit).format(isoFormat);
		case "ArrowRight":
			return current.add(1, unit).format(isoFormat);
		case "ArrowUp":
			return current.subtract(columns, unit).format(isoFormat);
		case "ArrowDown":
			return current.add(columns, unit).format(isoFormat);
		case "Home":
			return current.subtract(column, unit).format(isoFormat);
		case "End":
			return current.add(columns - 1 - column, unit).format(isoFormat);
		case "PageUp":
			return current.subtract(pageSize, pageUnit).format(isoFormat);
		case "PageDown":
			return current.add(pageSize, pageUnit).format(isoFormat);
		default:
			return null;
	}
};

/** Retain the day (and month for a year pick), clamped in the destination. */
export const focusInPeriod = (
	date: IsoDate,
	period: IsoDate,
	view: "months" | "years"
): IsoDate => {
	const current = dayjs(date);
	const target = dayjs(period);
	return view === "years"
		? current.year(target.year()).format(isoFormat)
		: target
				.date(Math.min(current.date(), target.daysInMonth()))
				.format(isoFormat);
};

export const monthTitle = (month: IsoDate, language: string): string =>
	dayjs(month).locale(localeFor(language)).format("MMMM YYYY");

export const yearTitle = (month: IsoDate, language: string): string =>
	dayjs(month).locale(localeFor(language)).format("YYYY");

export const pageYear = (month: IsoDate, years: number): IsoDate =>
	dayjs(month).startOf("month").add(years, "year").format(isoFormat);

type CalendarPeriod = { date: IsoDate; label: string; shortLabel: string };

export const yearBlockTitle = (month: IsoDate, language: string): string => {
	const first = dayjs(month).startOf("year").year(yearBlockStart(month));
	return `${yearTitle(first.format(isoFormat), language)} - ${yearTitle(first.add(yearBlockLength - 1, "year").format(isoFormat), language)}`;
};

export const pageYearBlock = (month: IsoDate, direction: -1 | 1): IsoDate =>
	pageYear(month, direction * yearBlockLength);

export const yearRows = (
	month: IsoDate,
	language: string
): Array<Array<CalendarPeriod>> => {
	const first = dayjs(month)
		.locale(localeFor(language))
		.startOf("year")
		.year(yearBlockStart(month));
	return Array.from({ length: 3 }, (_, row) =>
		Array.from({ length: 4 }, (_, column) => {
			const date = first.add(row * 4 + column, "year");
			return {
				date: date.format(isoFormat),
				label: date.format("YYYY"),
				shortLabel: date.format("YYYY"),
			};
		})
	);
};

export const monthRows = (
	month: IsoDate,
	language: string
): Array<Array<CalendarPeriod>> => {
	const first = dayjs(month).locale(localeFor(language)).startOf("year");
	return Array.from({ length: 3 }, (_, row) =>
		Array.from({ length: 4 }, (_, column) => {
			const date = first.add(row * 4 + column, "month");
			return {
				date: date.format(isoFormat),
				label: date.format("MMMM"),
				shortLabel: date.format("MMM"),
			};
		})
	);
};

/** Monday-first regardless of the locale's own first day of the week. */
export const dayWeeks = (
	month: IsoDate,
	language: string
): Array<Array<CalendarDay>> => {
	const first = dayjs(month).locale(localeFor(language)).startOf("month");
	const start = first.subtract((first.day() + 6) % calendarWeekLength, "day");
	return Array.from({ length: calendarWeekCount }, (_, week) =>
		Array.from({ length: calendarWeekLength }, (_, weekday) => {
			const date = start.add(week * calendarWeekLength + weekday, "day");
			return {
				date: date.format(isoFormat),
				label: date.format("dddd, D MMMM YYYY"),
				day: date.format("D"),
				weekend: weekday >= 5,
				outsideMonth: !date.isSame(first, "month"),
			};
		})
	);
};

export const weekdayLabels = (language: string): Array<Weekday> => {
	const monday = dayjs("2026-06-01").locale(localeFor(language));
	return Array.from({ length: calendarWeekLength }, (_, index) => ({
		label: monday.add(index, "day").format("dddd"),
		shortLabel: monday.add(index, "day").format("ddd"),
		weekend: index >= 5,
	}));
};
