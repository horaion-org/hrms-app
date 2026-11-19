import dayjs from "dayjs";
import { z } from "zod";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import { mondayOf, type DateRange } from "@/common/weeks";
import type {
	MyRosterDays,
	MyRosterDaysRoster,
} from "@/features/scheduling/myRoster/api";
import {
	rosterFromAssignments,
	type RosterCell,
} from "@/features/scheduling/roster/roster";

/*
 * The My roster page's days without any I/O: the two weeks shown from a
 * Monday, and each day's own tile and roster.
 */

/** How many days the page shows at once: two weeks. */
export const DAYS_SHOWN = 14;

/** One day of the caller's: their tile and its roster, or neither on a day no published roster covers for them. */
export type MyRosterDay = {
	/** ISO date. */
	date: string;
	cell?: RosterCell;
	roster?: MyRosterDaysRoster;
};

const isMonday = (date: string): boolean => mondayOf(date) === date;

const searchSchema = z.object({
	/** The first day shown, a Monday; this week's when left out. */
	from: z.iso.date().refine(isMonday).optional().catch(undefined),
});

/** The page's view that belongs in the URL: the Monday shown first. */
export type MyRosterDaysSearch = z.infer<typeof searchSchema>;

/** Reads the URL's first Monday, dropping one that is not a Monday or not a date. */
export const parseMyRosterDaysSearch = (
	search: Record<string, unknown>
): MyRosterDaysSearch => {
	const { from } = searchSchema.parse(search);
	return from === undefined ? {} : { from };
};

/** The ISO date `days` after `date` (before it when negative). */
const addDays = (date: string, days: number): string =>
	dayjs(date).add(days, "day").format(ISO_DATE_FORMAT);

/** The two weeks shown from `monday`: that Monday to the Sunday a week later. */
export const windowFrom = (monday: string): DateRange => ({
	start: monday,
	end: addDays(monday, DAYS_SHOWN - 1),
});

/** The first Monday of the two weeks before (-1) or after (1) those starting `monday`. */
export const stepWindow = (monday: string, step: 1 | -1): string =>
	addDays(monday, step * DAYS_SHOWN);

/** Every date of the two weeks from `monday`, in order. */
const datesFrom = (monday: string): Array<string> =>
	Array.from({ length: DAYS_SHOWN }, (_, offset) => addDays(monday, offset));

/**
 * Each day of the two weeks from `monday`, with the caller's own tile and the
 * roster it is on; a day without a row of theirs has neither.
 */
export const myRosterDaysFrom = (
	monday: string,
	answer: MyRosterDays
): Array<MyRosterDay> => {
	const window = windowFrom(monday);
	// The caller's own rows only: they join one row, or none when there are none.
	const [ownRow] = rosterFromAssignments(
		answer.days.map((day) => day.assignment),
		window
	);
	const rosterOfDate = new Map(
		answer.days.map((day) => [
			day.assignment.day,
			answer.rosters.find((roster) => roster.scheduleId === day.scheduleId),
		])
	);
	return datesFrom(monday).map((date) => {
		const cell = ownRow?.days[date];
		const roster = rosterOfDate.get(date);
		return {
			date,
			...(cell ? { cell } : {}),
			...(roster ? { roster } : {}),
		};
	});
};
