import type { DayRun } from "@/features/scheduling/dates/api";
import type { MonthWeek } from "@/features/scheduling/months/api";

/*
 * A week card's days without a roster: the month read sends a day no part
 * with a roster covers as not covered, and a week without a schedule has no
 * roster at all. `today` is an ISO date.
 */

/** A run of a week's days with no roster; `passed` runs end before today and can't be scheduled. */
export type WeekGap = { days: DayRun; passed: boolean };

/** The week's runs of days with no roster, in day order; none for a week wholly past without a schedule. */
export const weekGapsOf = (
	week: Pick<MonthWeek, "periodStart" | "periodEnd" | "scheduleId" | "days">,
	today: string
): Array<WeekGap> => {
	if (week.scheduleId === null) {
		if (week.periodEnd < today) return [];
		const from = week.periodStart < today ? today : week.periodStart;
		return [{ days: { from, to: week.periodEnd }, passed: false }];
	}
	const gaps: Array<WeekGap> = [];
	let lastDate: string | undefined;
	for (const day of week.days) {
		if (day.covered) {
			lastDate = undefined;
			continue;
		}
		const passed = day.date < today;
		const last = gaps[gaps.length - 1];
		if (last && lastDate === last.days.to && last.passed === passed)
			last.days.to = day.date;
		else gaps.push({ days: { from: day.date, to: day.date }, passed });
		lastDate = day.date;
	}
	return gaps;
};
