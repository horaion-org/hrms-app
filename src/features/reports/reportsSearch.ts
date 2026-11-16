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

/** The ranges offered as tabs; "custom" is any other range, chosen with the date field. */
export const RANGE_PRESETS = [
	"thisMonth",
	"lastMonth",
	"lastThreeMonths",
	"custom",
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number];

/** How many months "last three months" spans, this one included. */
const THREE_MONTHS = 3;

/** The months a preset covers, both ends whole months. */
const presetMonths = (
	preset: Exclude<RangePreset, "custom">,
	today: Date
): { first: dayjs.Dayjs; last: dayjs.Dayjs } => {
	const thisMonth = dayjs(today).startOf("month");
	if (preset === "lastMonth") {
		const lastMonth = thisMonth.subtract(1, "month");
		return { first: lastMonth, last: lastMonth };
	}
	if (preset === "lastThreeMonths")
		return {
			first: thisMonth.subtract(THREE_MONTHS - 1, "month"),
			last: thisMonth,
		};
	return { first: thisMonth, last: thisMonth };
};

/** The range a preset stands for, from its first month's first day to its last month's last day. */
export const presetRange = (
	preset: Exclude<RangePreset, "custom">,
	today: Date
): DayRange => {
	const { first, last } = presetMonths(preset, today);
	return {
		from: first.format(ISO_DAY),
		to: last.endOf("month").format(ISO_DAY),
	};
};

/** The preset a range matches, or "custom" when it matches none. */
export const presetOf = (range: DayRange, today: Date): RangePreset =>
	RANGE_PRESETS.find((preset) => {
		if (preset === "custom") return true;
		const candidate = presetRange(preset, today);
		return candidate.from === range.from && candidate.to === range.to;
	}) ?? "custom";

/** The months the range touches, as the overtime read takes them. */
export const monthsOf = (range: DayRange): MonthSpan => ({
	from: dayjs(range.from).format(ISO_MONTH),
	to: dayjs(range.to).format(ISO_MONTH),
});
