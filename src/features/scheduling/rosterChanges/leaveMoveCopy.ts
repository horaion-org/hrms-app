import type { TFunction } from "i18next";
import type { RosterLeaveMove } from "@/features/scheduling/rosterChanges/rosterLeave";

const key = "scheduling.rosterEdit";

/** Whose day a leave move is about, as its notes name it. */
export type LeaveMoveFacts = {
	name: string;
	/** The day, formatted for reading. */
	day: string;
	/** The day holds a shift now, so leave on it needs cover. */
	dayHasShift: boolean;
};

/** What a leave move tells the person before they apply it; nothing for a move that edits the roster. */
export const leaveMoveNotes = (
	move: RosterLeaveMove | undefined,
	{ name, day, dayHasShift }: LeaveMoveFacts,
	t: TFunction
): Array<string> => {
	const facts = { name, day };
	switch (move?.kind) {
		case "putOnLeave":
			return [
				t(`${key}.leaveNote.putOnLeave`, facts),
				t(
					dayHasShift
						? `${key}.leaveNote.needsCover`
						: `${key}.leaveNote.usesNoLeave`,
					facts
				),
			];
		case "changeType":
			return [t(`${key}.leaveNote.oneDayOnly`, facts)];
		case "backToDayOff":
			return [t(`${key}.leaveNote.backToDayOff`, facts)];
		default:
			return [];
	}
};

/** The day before and after a leave move: the leave type it moves to, or a day off. */
export const leaveMoveChange = (
	move: RosterLeaveMove | undefined,
	before: string,
	leaveTypeLabel: (code: string) => string,
	t: TFunction
): { before: string; after: string } => ({
	before,
	after:
		move?.kind === "putOnLeave" || move?.kind === "changeType"
			? leaveTypeLabel(move.leaveType)
			: t(`${key}.dayOff`),
});
