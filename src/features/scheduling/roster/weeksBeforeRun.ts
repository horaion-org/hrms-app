import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import { type DateRange, daysOf, mondayOf, weeksOf } from "@/common/weeks";
import type { RosterRow } from "@/features/scheduling/roster/roster";
import type { RosterWeek } from "@/features/scheduling/roster/RosterWeekBar";
import type { DayBeforeRun } from "@/features/scheduling/startingContext/daysBeforeRun";
import {
	DAYS_BEFORE_A_RUN,
	isInDaysBeforeRun,
} from "@/features/scheduling/startingContext/enteredDays";

/*
 * Which days before a schedule's run its own roster shows, pure. The week
 * bar lists the Department's month, and a week with a schedule of its own
 * opens that schedule; only a week before the run that a month read lists
 * without a schedule, holding a known day, is shown here, read-only. A
 * Monday no read lists is never shown: not knowing is not "no schedule".
 * Days are ISO dates, so they compare as strings.
 */

/** The month ("YYYY-MM") a week belongs to: the month its Monday falls in, as the API's month reads assign it. */
const monthOfWeek = (monday: string): string => monday.slice(0, 7);

/**
 * The month to read besides the page's own (the month of the run's first
 * week): the month before, when the oldest week holding one of the 14 days
 * before the run falls in it; none when every such week is in the page's month.
 */
export const monthBeforeRunOf = (firstDay: string): string | undefined => {
	const oldestWeek = mondayOf(
		dayjs(firstDay).subtract(DAYS_BEFORE_A_RUN, "day").format(ISO_DATE_FORMAT)
	);
	const oldestMonth = monthOfWeek(oldestWeek);
	return oldestMonth === monthOfWeek(mondayOf(firstDay))
		? undefined
		: oldestMonth;
};

/** One month read as the roster needs it: still under way, and the weeks it lists once read (none when not asked or failed). */
export type MonthRead = {
	isLoading: boolean;
	data:
		| {
				weeks: ReadonlyArray<{
					periodStart: string;
					scheduleId: string | null;
				}>;
		  }
		| undefined;
};

/** What the month reads say of the weeks before a run: the Mondays they list without a schedule, and whether a read is still under way. */
export type MonthsBeforeRun = {
	mondaysWithoutSchedule: ReadonlyArray<string>;
	reading: boolean;
};

/**
 * The month reads (the page's own and, when needed, the month before) as
 * the weeks before a run need them. A read not asked for, or failed, is not
 * reading and lists nothing, so nothing in its month is shown.
 */
export const monthsBeforeRunOf = (
	reads: ReadonlyArray<MonthRead>
): MonthsBeforeRun => ({
	mondaysWithoutSchedule: reads.flatMap(
		(read) =>
			read.data?.weeks
				.filter((week) => week.scheduleId === null)
				.map((week) => week.periodStart) ?? []
	),
	reading: reads.some((read) => read.isLoading),
});

/**
 * The known days before the run of the people on this roster; someone not on
 * it adds nothing, and a row whose member no longer resolves gets none.
 */
export const daysOfRosterPeople = (
	days: ReadonlyArray<DayBeforeRun>,
	rows: ReadonlyArray<RosterRow>
): Array<DayBeforeRun> => {
	const people = new Set(
		rows.flatMap((row) =>
			row.membershipId !== null && row.memberProfileId
				? [row.memberProfileId]
				: []
		)
	);
	return days.filter((day) => people.has(day.memberProfileId));
};

/**
 * The Mondays of the weeks before the run's first week this page shows,
 * oldest first: each holds a known day within the 14 and a month read lists
 * it without a schedule. A week holding nothing is left out, even between
 * two that hold something.
 */
export const mondaysShownBeforeRun = (
	firstDay: string,
	days: ReadonlyArray<DayBeforeRun>,
	mondaysWithoutSchedule: ReadonlyArray<string>
): Array<string> => {
	const firstWeek = mondayOf(firstDay);
	const mondays = days
		.filter((day) => isInDaysBeforeRun(firstDay, day.date))
		.map((day) => mondayOf(day.date))
		.filter(
			(monday) => monday < firstWeek && mondaysWithoutSchedule.includes(monday)
		);
	return [...new Set(mondays)].sort();
};

/** The known days this page can show: in the run's first week, or in a week it shows before the run. */
export const daysShownBeforeRun = (
	firstDay: string,
	days: ReadonlyArray<DayBeforeRun>,
	mondaysShown: ReadonlyArray<string>
): Array<DayBeforeRun> =>
	days.filter((day) => {
		const monday = mondayOf(day.date);
		return (
			isInDaysBeforeRun(firstDay, day.date) &&
			(monday === mondayOf(firstDay) || mondaysShown.includes(monday))
		);
	});

/**
 * The shown week's days drawn as days before the run: those within the 14,
 * once a known day falls on one of them; none otherwise, so they stay "Not in
 * these days".
 */
export const beforeRunColumnsOf = (
	weekDays: ReadonlyArray<string>,
	firstDay: string,
	shownDays: ReadonlyArray<DayBeforeRun>
): Array<string> => {
	const columns = weekDays.filter((day) => isInDaysBeforeRun(firstDay, day));
	return shownDays.some((day) => columns.includes(day.date)) ? columns : [];
};

/** The days shown before the run by person (their profile), then by ISO date, as the grid looks them up. */
export const daysBeforeByMemberOf = (
	days: ReadonlyArray<DayBeforeRun>
): Map<string, Record<string, DayBeforeRun>> => {
	const byMember = new Map<string, Record<string, DayBeforeRun>>();
	for (const day of days)
		byMember.set(day.memberProfileId, {
			...byMember.get(day.memberProfileId),
			[day.date]: day,
		});
	return byMember;
};

/** Whether the week starting `monday` lies before the run's first week and holds one of the 14 days before it. */
const isWeekBeforeRun = (firstDay: string, monday: string): boolean =>
	monday < mondayOf(firstDay) &&
	daysOf(monday).some((day) => isInDaysBeforeRun(firstDay, day));

/** What deciding the shown week needs. */
export type ShownWeekInput = {
	/** The URL's week, a Monday; none for this week. */
	requested: string | undefined;
	/** Today in the schedule's time zone. */
	today: string;
	/** The days this schedule covers. */
	period: DateRange;
	firstDay: string;
	/** The Mondays this page shows before the run (`mondaysShownBeforeRun`). */
	mondaysShown: ReadonlyArray<string>;
	/** The days before, or the month's weeks, are still being read. */
	reading: boolean;
};

/**
 * The week shown, by its Monday: the URL's when it is one of the schedule's
 * own weeks or one shown before the run, or, while the read is under way,
 * any week holding a day before the run; else this week when the schedule
 * covers it; else the schedule's first week. This week alone never lands
 * before the run.
 */
export const shownWeekOf = ({
	requested,
	today,
	period,
	firstDay,
	mondaysShown,
	reading,
}: ShownWeekInput): string => {
	const ownWeeks = weeksOf(period).map((week) => week.start);
	const asked = requested ?? mondayOf(today);
	if (ownWeeks.includes(asked)) return asked;
	if (requested !== undefined && mondaysShown.includes(requested))
		return requested;
	if (
		requested !== undefined &&
		reading &&
		isWeekBeforeRun(firstDay, requested)
	)
		return requested;
	return ownWeeks[0] ?? asked;
};

/**
 * The bar's weeks with the weeks shown before the run, in Monday order,
 * each labelled `beforeRunState`: a month's entry without a schedule is
 * replaced, a Monday the month does not list is added. A week with a
 * schedule of its own is never among them, so it keeps opening that schedule.
 */
export const withWeeksBeforeRun = (
	weeks: ReadonlyArray<RosterWeek>,
	mondaysShown: ReadonlyArray<string>,
	beforeRunState: string
): Array<RosterWeek> => {
	const before = mondaysShown.map((start): RosterWeek => ({
		start,
		end: daysOf(start)[6] ?? start,
		state: beforeRunState,
	}));
	return [
		...weeks.filter((week) => !mondaysShown.includes(week.start)),
		...before,
	].sort((left, right) => left.start.localeCompare(right.start));
};

/** What the note says and where its button goes: how many people, and the newest week holding one of their days. */
export type EnteredNote = { count: number; week: string };

/** The note of the days entered by hand this page can show (`daysShownBeforeRun`); none without one. */
export const enteredNoteOf = (
	shownDays: ReadonlyArray<DayBeforeRun>
): EnteredNote | undefined => {
	const entered = shownDays.filter((day) => day.enteredByHand);
	const newest = entered
		.map((day) => day.date)
		.sort()
		.reverse()[0];
	if (newest === undefined) return undefined;
	return {
		count: new Set(entered.map((day) => day.memberProfileId)).size,
		week: mondayOf(newest),
	};
};
