import dayjs from "dayjs";
import { z } from "zod";
import type { DayRange, MonthSpan } from "@/features/dashboard/api";
import { unitSearchSchema } from "@/features/workspace/unitSearch";

/*
 * The Reports page's URL: its units and the range of days it reads, so a
 * reload or a link keeps them. The API takes at most 92 days.
 */

/** The longest range the API reads, in days, both ends included. */
export const MOST_DAYS_IN_RANGE = 92;

const ISO_DAY = "YYYY-MM-DD";
const ISO_MONTH = "YYYY-MM";

const searchSchema = unitSearchSchema.extend({
	from: z.iso.date().optional().catch(undefined),
	to: z.iso.date().optional().catch(undefined),
});

export type ReportsSearch = z.infer<typeof searchSchema>;

/** Reads the URL's units and range, dropping anything it does not recognise. */
export const parseReportsSearch = (
	search: Record<string, unknown>
): ReportsSearch => {
	const { branch, department, from, to } = searchSchema.parse(search);
	return {
		...(branch === undefined ? {} : { branch }),
		...(department === undefined ? {} : { department }),
		...(from === undefined ? {} : { from }),
		...(to === undefined ? {} : { to }),
	};
};

/** This calendar month, from its first day to its last: the range before one is chosen. */
export const defaultRange = (today: Date): DayRange => ({
	from: dayjs(today).startOf("month").format(ISO_DAY),
	to: dayjs(today).endOf("month").format(ISO_DAY),
});

/** The range the URL names, else this month. */
export const rangeOf = (search: ReportsSearch, today: Date): DayRange =>
	search.from && search.to
		? { from: search.from, to: search.to }
		: defaultRange(today);

/** Why the API would refuse the range, or undefined when it reads it. */
export const rangeProblemOf = (
	range: DayRange
): "inverted" | "tooLong" | undefined => {
	const days = dayjs(range.to).diff(dayjs(range.from), "day") + 1;
	if (days < 1) return "inverted";
	if (days > MOST_DAYS_IN_RANGE) return "tooLong";
	return undefined;
};

/** The months the range touches, as the overtime read takes them. */
export const monthsOf = (range: DayRange): MonthSpan => ({
	from: dayjs(range.from).format(ISO_MONTH),
	to: dayjs(range.to).format(ISO_MONTH),
});
