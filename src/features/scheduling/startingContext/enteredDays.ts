import dayjs from "dayjs";
import { ISO_DATE_FORMAT } from "@/common/isoDate";
import type {
	StartingCell,
	StartingDays,
} from "@/features/scheduling/startingContext/api";

/*
 * The days a manager entered by hand before a schedule's run, read out of
 * its starting days without I/O: what the roster shows of them. They are
 * never rostered days: a roster or approved leave on the same day wins, and
 * the API then answers that day as locked.
 */

/** How many days before a run the API answers, and lets a manager enter. */
export const DAYS_BEFORE_A_RUN = 14;

/** Whether `day` is one of the days before a run starting on `firstDay` that the API answers. */
export const isInDaysBeforeRun = (firstDay: string, day: string): boolean =>
	day < firstDay &&
	day >=
		dayjs(firstDay).subtract(DAYS_BEFORE_A_RUN, "day").format(ISO_DATE_FORMAT);

/** What a manager entered for a day: the shift worked, by name and times, or a day off by its type (null without one). */
export type EnteredWhat =
	| { kind: "shift"; name: string; start: string; end: string }
	| { kind: "off"; dayType: string | null };

/** One day entered by hand before a run: who, which day and what. */
export type EnteredDayBefore = {
	memberProfileId: string;
	name: string;
	jobTitle: string | null;
	date: string;
	what: EnteredWhat;
};

/**
 * What was entered in a cell; nothing for a day a roster or leave fills
 * (locked) or one not known. A worked day whose shift is no longer in use
 * names none and reads as not known, as the grid to enter them shows it.
 */
export const enteredWhatOf = (cell: StartingCell): EnteredWhat | undefined => {
	if (cell.locked) return undefined;
	if (cell.kind === "OFF") return { kind: "off", dayType: cell.dayType };
	if (
		cell.kind !== "WORKED" ||
		cell.shiftName === null ||
		cell.startTime === null ||
		cell.endTime === null
	)
		return undefined;
	return {
		kind: "shift",
		name: cell.shiftName,
		start: cell.startTime,
		end: cell.endTime,
	};
};

/** Every day entered by hand before a schedule's run, by person then day, as the API orders them. */
export const enteredDaysBeforeOf = (
	startingDays: StartingDays
): Array<EnteredDayBefore> =>
	startingDays.members.flatMap((member) =>
		member.cells.flatMap((cell) => {
			const what = enteredWhatOf(cell);
			return what
				? [
						{
							memberProfileId: member.memberProfileId,
							name: member.displayName,
							jobTitle: member.jobTitleName,
							date: cell.date,
							what,
						},
					]
				: [];
		})
	);

/** How many people have a day entered by hand before a schedule's run. */
export const peopleWithEnteredDays = (startingDays: StartingDays): number =>
	new Set(enteredDaysBeforeOf(startingDays).map((day) => day.memberProfileId))
		.size;
