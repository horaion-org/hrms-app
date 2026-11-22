import type {
	StartingCell,
	StartingDays,
} from "@/features/scheduling/startingContext/api";
import {
	enteredWhatOf,
	type EnteredWhat,
	shiftOrDayOffOf,
} from "@/features/scheduling/startingContext/enteredDays";

/*
 * Every known day before a schedule's run, read out of its starting days
 * without I/O: what the roster shows in its columns before the run. A day
 * not known is left out, never read as worked or off.
 */

/** What a person's day before the run was: a shift worked, a day off by its type, or leave. */
export type DayBeforeWhat = EnteredWhat | { kind: "leave" };

/** One known day before a run: who, which day, what, and whether it was entered by hand (`enteredWhatOf`). */
export type DayBeforeRun = {
	memberProfileId: string;
	date: string;
	what: DayBeforeWhat;
	enteredByHand: boolean;
};

/** The days before a run as the roster has them: still being read, or read. */
export type DaysBeforeRunState =
	{ status: "pending" } | { status: "ready"; days: Array<DayBeforeRun> };

/** What a cell says of a day, and whether it was entered by hand; nothing when it is not known. */
const knownDayOf = (
	cell: StartingCell
): Pick<DayBeforeRun, "what" | "enteredByHand"> | undefined => {
	const entered = enteredWhatOf(cell);
	if (entered) return { what: entered, enteredByHand: true };
	const what: DayBeforeWhat | undefined =
		cell.kind === "LEAVE" ? { kind: "leave" } : shiftOrDayOffOf(cell);
	return what && { what, enteredByHand: false };
};

/** Every known day before a schedule's run, by person then day, as the API orders them. */
export const daysBeforeRunOf = (
	startingDays: StartingDays
): Array<DayBeforeRun> =>
	startingDays.members.flatMap((member) =>
		member.cells.flatMap((cell) => {
			const known = knownDayOf(cell);
			return known
				? [
						{
							memberProfileId: member.memberProfileId,
							date: cell.date,
							...known,
						},
					]
				: [];
		})
	);
