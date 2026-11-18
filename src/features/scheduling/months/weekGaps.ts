import type { DayRun } from "@/features/scheduling/dates/api";
import type { MonthWeek } from "@/features/scheduling/months/api";
import { firstPublishedDayOf } from "@/features/scheduling/schedules/partLines";

/*
 * A week card's days without a roster: the month read sends a day no part
 * with a roster covers as not covered, and a week without a schedule has no
 * roster at all. `today` is an ISO date.
 */

/**
 * What can be done with a run of a week's days with no roster: schedule it
 * (`open`), nothing once it has passed (`passed`), or nothing while a
 * published part of the week comes after it (`beforePublished`, API ADR-0129).
 */
export type WeekGapKind = "open" | "passed" | "beforePublished";

/** A run of a week's days with no roster, and what can be done with it. */
export type WeekGap = { days: DayRun; kind: WeekGapKind };

/**
 * What can be done with one day with no roster. The month read doesn't say
 * which parts had their publication withdrawn, so only PUBLISHED parts count
 * as published here (`firstPublishedDay`, from `firstPublishedDayOf`).
 */
const gapKindOf = (
	date: string,
	today: string,
	firstPublishedDay: string | undefined
): WeekGapKind => {
	if (date < today) return "passed";
	if (firstPublishedDay !== undefined && date < firstPublishedDay)
		return "beforePublished";
	return "open";
};

/** The week's runs of days with no roster, in day order; none for a week wholly past without a schedule. */
export const weekGapsOf = (
	week: Pick<
		MonthWeek,
		"periodStart" | "periodEnd" | "scheduleId" | "days" | "parts"
	>,
	today: string
): Array<WeekGap> => {
	if (week.scheduleId === null) {
		if (week.periodEnd < today) return [];
		const from = week.periodStart < today ? today : week.periodStart;
		return [{ days: { from, to: week.periodEnd }, kind: "open" }];
	}
	const firstPublishedDay = firstPublishedDayOf(week.parts);
	const gaps: Array<WeekGap> = [];
	let lastDate: string | undefined;
	for (const day of week.days) {
		if (day.covered) {
			lastDate = undefined;
			continue;
		}
		const kind = gapKindOf(day.date, today, firstPublishedDay);
		const last = gaps[gaps.length - 1];
		if (last && lastDate === last.days.to && last.kind === kind)
			last.days.to = day.date;
		else gaps.push({ days: { from: day.date, to: day.date }, kind });
		lastDate = day.date;
	}
	return gaps;
};
