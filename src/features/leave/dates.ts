import dayjs from "dayjs";
import type { DateRange } from "@/components/forms/Calendar";

export const shiftRange = (range: DateRange, direction: number): DateRange => {
	const days = dayjs(range.end).diff(dayjs(range.start), "day") + 1;
	return {
		start: dayjs(range.start)
			.add(days * direction, "day")
			.format("YYYY-MM-DD"),
		end: dayjs(range.end)
			.add(days * direction, "day")
			.format("YYYY-MM-DD"),
	};
};

export const formatPeriod = (
	start: string,
	end: string,
	language: string
): string =>
	new Intl.DateTimeFormat(language, {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).formatRange(new Date(`${start}T12:00:00`), new Date(`${end}T12:00:00`));

/** Inclusive calendar dates, using local calendar arithmetic rather than UTC offsets. */
export const rangeDays = (range: DateRange): Array<string> =>
	Array.from(
		{ length: dayjs(range.end).diff(dayjs(range.start), "day") + 1 },
		(_, index) => dayjs(range.start).add(index, "day").format("YYYY-MM-DD")
	);

/** Four weeks from the Monday of this week, the timeline's first window. */
export const defaultRange = (today = dayjs()): DateRange => {
	const monday = today.subtract((today.day() + 6) % 7, "day");
	return {
		start: monday.format("YYYY-MM-DD"),
		end: monday.add(27, "day").format("YYYY-MM-DD"),
	};
};

/**
 * The calendar day `instant` falls on in `timeZone`, as YYYY-MM-DD; the
 * browser's own zone when none is given. A request made at 07:30 in
 * Singapore is that day, not the UTC day before that the instant's first
 * ten characters name.
 */
export const calendarDayOf = (instant: string, timeZone?: string): string => {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date(instant));
	const part = (type: Intl.DateTimeFormatPartTypes): string =>
		parts.find((item) => item.type === type)?.value ?? "";
	return `${part("year")}-${part("month")}-${part("day")}`;
};

/**
 * The day a leave request was made, in its member's Branch's zone (the
 * browser's when the member has none), so a request made at 07:30 in
 * Singapore reads as that day wherever the reviewer sits.
 */
export const requestedDayOf = (request: {
	requestedAt: string;
	branchTimeZone: string | null;
}): string =>
	calendarDayOf(request.requestedAt, request.branchTimeZone ?? undefined);
