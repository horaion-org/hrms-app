import type {
	EnteredDay,
	StartingCell,
	StartingContext,
	StartingDays,
} from "@/features/scheduling/startingContext/api";

/**
 * A cell's value in the grid's select: not known, a day off by its type, or
 * a shift by id. `off:` alone is a day off without a type.
 */
export type CellValue = "" | `off:${string}` | `shift:${string}`;

/** The entered values the grid holds, by member then date; locked cells are never in it. */
export type Entries = Record<string, Record<string, CellValue>>;

/** How the Generate step speaks of the week before. */
export type PreviousWeek =
	| { kind: "none" }
	| { kind: "carried"; periodStart: string; uncovered: number };

/** How the dialog splits the days before the period: the nearer week, and any earlier days. */
export type SplitDays = { earlier: Array<string>; nearer: Array<string> };

const SHIFT_PREFIX = "shift:";
const OFF_PREFIX = "off:";

/** The days nearest the period the dialog shows first. */
export const NEARER_DAYS = 7;

/** The value a cell holds when it names the shift worked. */
export const shiftCellValue = (shiftId: string): CellValue =>
	`${SHIFT_PREFIX}${shiftId}`;

/** The value a cell holds when it is a day off of a type, or of none. */
export const offCellValue = (dayType: string | null): CellValue =>
	`${OFF_PREFIX}${dayType ?? ""}`;

/** The value an entered cell holds; a locked or unknown cell holds none. */
const valueOf = (cell: StartingCell): CellValue => {
	if (cell.locked || cell.kind === null) return "";
	if (cell.kind === "OFF") return offCellValue(cell.dayType);
	return cell.shiftId === null ? "" : shiftCellValue(cell.shiftId);
};

/** The grid's entered values as the API answered them. */
export const initialEntries = (week: StartingDays): Entries =>
	Object.fromEntries(
		week.members.map((member) => [
			member.memberProfileId,
			Object.fromEntries(
				member.cells
					.filter((cell) => !cell.locked)
					.map((cell) => [cell.date, valueOf(cell)])
			),
		])
	);

/**
 * The types an entered day off can take: the schedule's, then any an entered
 * day already has that the schedule no longer offers, so it still shows and
 * is kept. Null is a day off without a type, offered when the schedule names
 * none (an older API). Pure.
 */
export const offDayTypes = (
	week: StartingDays,
	nonWorkingDayTypes: ReadonlyArray<string>
): Array<string | null> => {
	const offered = nonWorkingDayTypes.length > 0 ? nonWorkingDayTypes : [null];
	const entered = week.members.flatMap((member) =>
		member.cells
			.filter((cell) => !cell.locked && cell.kind === "OFF")
			.map((cell) => cell.dayType)
	);
	return [...new Set([...offered, ...entered])];
};

/** The last `NEARER_DAYS` days, and whatever comes before them, both in order. */
export const splitDays = (days: Array<string>): SplitDays => ({
	earlier: days.slice(0, Math.max(days.length - NEARER_DAYS, 0)),
	nearer: days.slice(-NEARER_DAYS),
});

/** Whether any member has a value entered on one of the dates. */
export const hasEnteredDayOn = (
	entries: Entries,
	dates: Array<string>
): boolean =>
	Object.values(entries).some((days) =>
		dates.some((date) => (days[date] ?? "") !== "")
	);

/** A member's cell on a date, or undefined when the answer has none. */
export const cellOn = (
	member: StartingDays["members"][number],
	date: string
): StartingCell | undefined => member.cells.find((cell) => cell.date === date);

/** Sets one cell; a locked cell is never set. */
export const withCell = (
	entries: Entries,
	memberProfileId: string,
	date: string,
	value: CellValue
): Entries => ({
	...entries,
	[memberProfileId]: { ...entries[memberProfileId], [date]: value },
});

/** Fills every empty, unlocked cell of one day with a value, leaving entered ones as they are. */
export const fillEmpty = (
	entries: Entries,
	date: string,
	value: CellValue
): Entries =>
	Object.fromEntries(
		Object.entries(entries).map(([member, days]) => [
			member,
			date in days && days[date] === "" ? { ...days, [date]: value } : days,
		])
	);

/** One entered cell as the save sends it: a day off with its type when it has one, or a shift. */
const enteredDayOf = (
	memberProfileId: string,
	date: string,
	value: CellValue
): EnteredDay => {
	if (value.startsWith(SHIFT_PREFIX))
		return {
			memberProfileId,
			date,
			kind: "SHIFT",
			shiftId: value.slice(SHIFT_PREFIX.length),
		};
	const dayType = value.slice(OFF_PREFIX.length);
	const dayOff: EnteredDay = {
		memberProfileId,
		date,
		kind: "OFF",
		shiftId: null,
	};
	return dayType === "" ? dayOff : { ...dayOff, dayType };
};

/** The save body: one day per entered cell; an empty cell is left out (not known). */
export const enteredDays = (entries: Entries): Array<EnteredDay> =>
	Object.entries(entries).flatMap(([memberProfileId, days]) =>
		Object.entries(days)
			.filter(([, value]) => value !== "")
			.map(([date, value]) => enteredDayOf(memberProfileId, date, value))
	);

/**
 * Whether a roster covers the day before the period and, when it does, how
 * many members it doesn't (a new joiner): those can still have days added.
 */
export const previousWeekOf = (week: StartingDays): PreviousWeek => {
	if (week.previousRoster === null) return { kind: "none" };
	const dayBefore = week.days[week.days.length - 1];
	const uncovered = week.members.filter((member) =>
		member.cells.some((cell) => cell.date === dayBefore && !cell.locked)
	).length;
	return {
		kind: "carried",
		periodStart: week.previousRoster.periodStart,
		uncovered,
	};
};

/** How many members have any day entered. */
export const enteredMemberCount = (entries: Entries): number =>
	Object.values(entries).filter((days) =>
		Object.values(days).some((value) => value !== "")
	).length;

/**
 * The run of working days a member brings into the period, for the roster's
 * badge; none when they bring none or the context isn't known.
 */
export const runsByMember = (context: StartingContext): Map<string, number> =>
	new Map(
		context.members.flatMap(({ memberProfileId, consecutiveWorkingDays }) =>
			memberProfileId !== null && consecutiveWorkingDays > 0
				? [[memberProfileId, consecutiveWorkingDays] as const]
				: []
		)
	);
