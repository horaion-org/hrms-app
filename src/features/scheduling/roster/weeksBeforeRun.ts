import { type DateRange, daysOf, mondayOf, weeksOf } from "@/common/weeks";
import type { RosterRow } from "@/features/scheduling/roster/roster";
import type { RosterWeek } from "@/features/scheduling/roster/RosterWeekBar";
import type { DayBeforeRun } from "@/features/scheduling/startingContext/daysBeforeRun";
import { isInDaysBeforeRun } from "@/features/scheduling/startingContext/enteredDays";

/*
 * Which days before a schedule's run its own roster shows, pure. The week
 * bar lists the Department's month, and a week with a schedule of its own
 * opens that schedule; only a week before the run without one, holding a
 * known day, is shown here, read-only. Days are ISO dates, so they compare
 * as strings.
 */

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

/** Whether a week of the month has a schedule of its own: listed and choosable. */
const hasOwnSchedule = (
	monthWeeks: ReadonlyArray<RosterWeek>,
	monday: string
): boolean =>
	monthWeeks.some((week) => week.start === monday && !week.disabled);

/**
 * The Mondays of the weeks before the run's first week this page shows,
 * oldest first: each holds a known day within the 14 and has no schedule of
 * its own in the month (listed as not choosable, or not listed). A week
 * holding nothing is left out, even between two that hold something.
 */
export const mondaysShownBeforeRun = (
	firstDay: string,
	days: ReadonlyArray<DayBeforeRun>,
	monthWeeks: ReadonlyArray<RosterWeek>
): Array<string> => {
	const firstWeek = mondayOf(firstDay);
	const mondays = days
		.filter((day) => isInDaysBeforeRun(firstDay, day.date))
		.map((day) => mondayOf(day.date))
		.filter(
			(monday) => monday < firstWeek && !hasOwnSchedule(monthWeeks, monday)
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
