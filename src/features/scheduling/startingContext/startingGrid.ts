import type {
	EnteredDay,
	StartingCell,
	StartingContext,
	StartingDays,
} from "@/features/scheduling/startingContext/api";

/** A cell's value in the grid's select: not known, a day off, or a shift by id. */
export type CellValue = "" | "OFF" | `shift:${string}`;

/** The entered values the grid holds, by member then date; locked cells are never in it. */
export type Entries = Record<string, Record<string, CellValue>>;

/** How the Generate step speaks of the week before. */
export type PreviousWeek =
	| { kind: "none" }
	| { kind: "carried"; periodStart: string; uncovered: number };

const SHIFT_PREFIX = "shift:";

/** The value a cell holds when it names the shift worked. */
export const shiftCellValue = (shiftId: string): CellValue =>
	`${SHIFT_PREFIX}${shiftId}`;

/** The value an entered cell holds; a locked or unknown cell holds none. */
const valueOf = (cell: StartingCell): CellValue => {
	if (cell.locked || cell.kind === null) return "";
	if (cell.kind === "OFF") return "OFF";
	return cell.shiftId === null ? "" : shiftCellValue(cell.shiftId);
};

/** An empty day nobody asks for: it falls before the member started. */
export const isNotAsked = (cell: StartingCell): boolean =>
	cell.kind === null && !cell.locked && !cell.missing;

/** The grid's entered values as the API answered them; a day not asked for is not held. */
export const initialEntries = (week: StartingDays): Entries =>
	Object.fromEntries(
		week.members.map((member) => [
			member.memberProfileId,
			Object.fromEntries(
				member.cells
					.filter((cell) => !cell.locked && !isNotAsked(cell))
					.map((cell) => [cell.date, valueOf(cell)])
			),
		])
	);

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

/** The days and people the API says generation still needs. */
export const missingDayCounts = (
	week: StartingDays
): { days: number; people: number } => {
	const perMember = week.members.map(
		(member) => member.cells.filter((cell) => cell.missing).length
	);
	return {
		days: perMember.reduce((total, days) => total + days, 0),
		people: perMember.filter((days) => days > 0).length,
	};
};

/** Whether a missing day is still blank in the grid, where it may already be chosen. */
export const isUnanswered = (
	cell: StartingCell,
	memberProfileId: string,
	entries: Entries
): boolean => cell.missing && !entries[memberProfileId]?.[cell.date];

/** How many of one member's missing days are still blank in the grid. */
const unansweredCount = (
	member: StartingDays["members"][number],
	entries: Entries
): number =>
	member.cells.filter((cell) =>
		isUnanswered(cell, member.memberProfileId, entries)
	).length;

/** How many missing days are still blank, for each member with any. */
export const unansweredByMember = (
	week: StartingDays,
	entries: Entries
): Map<string, number> =>
	new Map(
		week.members.flatMap((member) => {
			const count = unansweredCount(member, entries);
			return count > 0 ? [[member.memberProfileId, count] as const] : [];
		})
	);

/** Marks every blank missing day as off; a day already chosen is never overwritten. */
export const markMissingOff = (week: StartingDays, entries: Entries): Entries =>
	week.members.reduce(
		(marked, member) =>
			member.cells
				.filter((cell) => isUnanswered(cell, member.memberProfileId, marked))
				.reduce(
					(current, cell) =>
						withCell(current, member.memberProfileId, cell.date, "OFF"),
					marked
				),
		entries
	);

/** The save body: one day per entered cell; an empty cell is left out (not known). */
export const enteredDays = (entries: Entries): Array<EnteredDay> =>
	Object.entries(entries).flatMap(([memberProfileId, days]) =>
		Object.entries(days)
			.filter(([, value]) => value !== "")
			.map(([date, value]) =>
				value === "OFF"
					? { memberProfileId, date, kind: "OFF" as const, shiftId: null }
					: {
							memberProfileId,
							date,
							kind: "SHIFT" as const,
							shiftId: value.slice(SHIFT_PREFIX.length),
						}
			)
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
