import type {
	RepairMove,
	RepairOption,
} from "@/features/scheduling/cover/engineRepairApi";
import type { RosterChangeCell } from "@/features/scheduling/rosterChanges/api";

/*
 * An engine option as the roster change Find cover's "Apply change" makes,
 * pure. Only what that change states exactly is turned into cells: a call-in
 * (the person works the shift that day), a move between shifts on one day
 * (the person's day becomes the other shift), and a stretch into overtime
 * with its side (the person keeps their shift and works the minutes before
 * or after it, the API's ADR-0110). A stretch without a side, a move to
 * another day (the day left would need a day type the engine never names), a
 * person the roster no longer names, or two moves on one person's day are
 * made by hand.
 */

/** A stretch as its shift kept, with the minutes on its side. */
const stretchCellOf = (
	move: RepairMove,
	cell: Extract<RosterChangeCell, { kind: "WORK" }>
): RosterChangeCell | undefined => {
	if (!move.side || move.extensionMinutes === null) return undefined;
	return move.side === "BEFORE_SHIFT"
		? { ...cell, stretchBeforeMinutes: move.extensionMinutes }
		: { ...cell, stretchAfterMinutes: move.extensionMinutes };
};

/** One move as a cell, or nothing when the change cannot state it exactly. */
const cellOf = (move: RepairMove): RosterChangeCell | undefined => {
	if (move.membershipId === null || move.shiftId === null || move.date === null)
		return undefined;
	const cell = {
		membershipId: move.membershipId,
		day: move.date,
		kind: "WORK" as const,
		shiftId: move.shiftId,
	};
	if (move.kind === "OVERTIME_EXTENSION") return stretchCellOf(move, cell);
	const sameDay = move.kind === "REASSIGN" && move.fromDate === move.date;
	if (move.kind !== "CALL_IN" && !sameDay) return undefined;
	return cell;
};

/**
 * The option's change as Find cover's cells, or undefined when it has to be
 * made by hand: an infeasible option, one with no moves, or one with any
 * move the change cannot state exactly.
 */
export const repairCells = (
	option: RepairOption
): Array<RosterChangeCell> | undefined => {
	if (!option.feasible || option.moves.length === 0) return undefined;
	const cells = option.moves.map(cellOf);
	if (cells.some((cell) => cell === undefined)) return undefined;
	const applicable = cells as Array<RosterChangeCell>;
	const days = new Set(
		applicable.map((cell) => `${cell.membershipId}|${cell.day}`)
	);
	return days.size === applicable.length ? applicable : undefined;
};
