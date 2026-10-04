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
