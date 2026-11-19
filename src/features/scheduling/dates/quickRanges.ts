import dayjs, { type Dayjs } from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import { mondayOf } from "@/common/weeks";

/*
 * The quick choices of days on Generate, pure. A choice only fills the first
 * and last day; the form checks them like days picked by hand. Dates are ISO
 * strings ("YYYY-MM-DD"), `today` included: the branch's today.
 */

/** The quick choices, in the order they are offered. */
export const QUICK_CHOICES = [
	"restOfWeek",
	"nextWeek",
	"thisMonth",
	"nextMonth",
] as const;

export type QuickChoice = (typeof QUICK_CHOICES)[number];

/** The first and last day a quick choice fills in. */
export type QuickRange = { firstDay: string; lastDay: string };

const rangeOf = (firstDay: Dayjs, lastDay: Dayjs): QuickRange => ({
	firstDay: firstDay.format(ISO_DATE_FORMAT),
	lastDay: lastDay.format(ISO_DATE_FORMAT),
});

/**
 * The days a quick choice stands for on `today`: today to Sunday, next Monday
 * to its Sunday, today to the month's last day, or the whole of next month.
 * None starts before today or is longer than a calendar month.
 */
export const quickRangeOf = (choice: QuickChoice, today: string): QuickRange => {
	const day = dayjs(today);
	const monday = dayjs(mondayOf(today));
	switch (choice) {
		case "restOfWeek":
			return rangeOf(day, monday.add(6, "day"));
		case "nextWeek":
			return rangeOf(monday.add(7, "day"), monday.add(13, "day"));
		case "thisMonth":
			return rangeOf(day, day.endOf("month"));
		case "nextMonth": {
			const first = day.add(1, "month").startOf("month");
			return rangeOf(first, first.endOf("month"));
		}
	}
};
