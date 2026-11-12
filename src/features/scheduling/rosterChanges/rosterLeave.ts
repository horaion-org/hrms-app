import { ApiProblemError } from "@/common/problem";
import { LEAVE_REFUSAL_CODES } from "@/features/leave/leaveRefusal";
import type {
	RosterChangeBody,
	RosterChangeCell,
} from "@/features/scheduling/rosterChanges/api";
import type { RosterEditChoice } from "@/features/scheduling/rosterChanges/rosterEdit";
import type { ScheduleAssignment } from "@/features/scheduling/schedules/api";

/*
 * What the roster editor can do with a day's leave, without any I/O. The
 * roster never writes leave: each move calls Leave, and two of them follow
 * with a normal roster edit (hrms-backend-v2 docs/adr/0065).
 */

/** What the person is about to do with a day, before choosing the shift, person or leave type. */
export type RosterPanelMode =
	"shift" | "dayOff" | "swap" | "leave" | "anotherType";

/** A move that goes through Leave. */
export type RosterLeaveMove =
	| { kind: "putOnLeave"; leaveType: string }
	| { kind: "changeType"; leaveType: string }
	| { kind: "backToDayOff" }
	| { kind: "backToShift"; shiftId: string };

/** The day reads as leave, or as a day off under approved leave: there is a request to act on. */
export const isLeaveDay = (assignment: ScheduleAssignment): boolean =>
	assignment.shift === null && Boolean(assignment.leaveRequestId);

/**
 * A manager must decide this day. Someone who sees leave reads why; a roster
 * editor who doesn't gets the same day as one needing attention, and no more.
 */
export const needsDecision = (assignment: ScheduleAssignment): boolean =>
	assignment.flag === "NEEDS_DECISION" || assignment.flag === "NEEDS_ATTENTION";

/** The change that last touched the day was a leave decision, so leaving it needs a roster edit too. */
export const leaveTookTheShift = (assignment: ScheduleAssignment): boolean =>
	assignment.lastChange?.reason === "LEAVE_APPROVED" ||
	assignment.lastChange?.reason === "LEAVE_RECORDED";

/** What decides the panel's choices for a day. */
export type PanelModeFacts = {
	assignment: ScheduleAssignment;
	/** The frozen shifts are read, so a shift can be chosen. */
	hasShifts: boolean;
	/** The person may change this member's leave from the roster. */
	mayChangeLeave: boolean;
	/** A type can be chosen for the day not worked (`dayTypeChoices`). */
	canChooseDayType: boolean;
};

/**
 * The choices a day offers. A leave day offers only leave moves, and only to
 * someone who may make them; otherwise it stays read-only as before. A plain
 * day off under leave someone can't change keeps the roster's own choices.
 * A day already not worked offers not working again only to change its type.
 * Leave is offered only where no request covers the day. Pure.
 */
export const panelModes = ({
	assignment,
	hasShifts,
	mayChangeLeave,
	canChooseDayType,
}: PanelModeFacts): Array<RosterPanelMode> => {
	const shiftChoice: Array<RosterPanelMode> = hasShifts ? ["shift"] : [];
	if (isLeaveDay(assignment) && mayChangeLeave)
		return ["anotherType", ...shiftChoice, "dayOff"];
	if (assignment.offReason === "LEAVE") return [];
	return [
		...shiftChoice,
		...(assignment.shift !== null ||
		needsDecision(assignment) ||
		canChooseDayType
			? (["dayOff"] as const)
			: []),
		...(mayChangeLeave && !assignment.leaveRequestId
			? (["leave"] as const)
			: []),
		"swap",
	];
};

/**
 * The leave move a chosen mode makes, or undefined when it is a plain roster
 * edit or still incomplete. Pure.
 */
export const leaveMoveOf = (
	assignment: ScheduleAssignment,
	mode: RosterPanelMode | undefined,
	choice: { leaveType: string | undefined; shiftId: string | undefined }
): RosterLeaveMove | undefined => {
	if (mode === "leave" && choice.leaveType !== undefined)
		return { kind: "putOnLeave", leaveType: choice.leaveType };
	if (mode === "anotherType" && choice.leaveType !== undefined)
		return { kind: "changeType", leaveType: choice.leaveType };
	if (!isLeaveDay(assignment)) return undefined;
	if (mode === "dayOff") return { kind: "backToDayOff" };
	if (mode === "shift" && choice.shiftId !== undefined)
		return { kind: "backToShift", shiftId: choice.shiftId };
	return undefined;
};

/** The roster edit a leave day's mode previews: the shift it gives back; the other moves have nothing to preview. */
export const rosterChoiceOfLeaveMove = (
	move: RosterLeaveMove | undefined
): RosterEditChoice | undefined =>
	move?.kind === "backToShift"
		? { kind: "shift", shiftId: move.shiftId }
		: undefined;

/** What decides the roster edit a day's choices make. */
export type EditChoiceFacts = {
	/** A leave day the person may change: only its leave move can edit the roster. */
	leaveDayEditable: boolean;
	mode: RosterPanelMode | undefined;
	shiftId: string | undefined;
	/** The type the day not worked takes; none when the schedule offers none. */
	dayType: string | undefined;
	partner: ScheduleAssignment | undefined;
	leaveMove: RosterLeaveMove | undefined;
};

/**
 * The roster edit the chosen mode makes once its shift or partner is picked;
 * undefined while incomplete, and for leave moves that don't edit the roster. Pure.
 */
export const editChoiceOf = ({
	leaveDayEditable,
	mode,
	shiftId,
	dayType,
	partner,
	leaveMove,
}: EditChoiceFacts): RosterEditChoice | undefined => {
	if (leaveDayEditable) return rosterChoiceOfLeaveMove(leaveMove);
	if (mode === "dayOff") return { kind: "dayOff", dayType };
	if (mode === "shift" && shiftId !== undefined)
		return { kind: "shift", shiftId };
	if (mode === "swap" && partner !== undefined)
		return { kind: "swap", partner };
	return undefined;
};

/**
 * The roster change to preview and apply, or undefined when there are no
 * cells. Taking someone off leave cancels the leave first, so the checks read
 * the day as it will then be. Pure.
 */
export const rosterChangeBodyOf = ({
	revision,
	cells,
	leaveMove,
	day,
}: {
	revision: number;
	cells: Array<RosterChangeCell>;
	leaveMove: RosterLeaveMove | undefined;
	day: string;
}): RosterChangeBody | undefined =>
	cells.length > 0
		? {
				expectedRevision: revision,
				cells,
				...(leaveMove?.kind === "backToShift"
					? { assumeLeaveCancelledOn: [day] }
					: {}),
			}
		: undefined;

/** Whether a move writes the roster, so a published one asks first. Changing the type alone does not. */
export const moveChangesRoster = (
	assignment: ScheduleAssignment,
	move: RosterLeaveMove
): boolean => {
	switch (move.kind) {
		case "putOnLeave":
			return assignment.shift !== null;
		case "changeType":
			return false;
		case "backToDayOff":
			return leaveTookTheShift(assignment);
		case "backToShift":
			return true;
	}
};

/** Why a leave move didn't go through: one message each. */
export type RosterLeaveRefusal = "overlaps" | "forbidden" | "failed";

/** Which message a failed leave move shows; a member outside Leave's scope answers 404. Pure. */
export const rosterLeaveRefusal = (error: unknown): RosterLeaveRefusal => {
	if (!(error instanceof ApiProblemError)) return "failed";
	if (error.status === 403 || error.status === 404) return "forbidden";
	return `${error.status} ${error.errorCode ?? ""}` ===
		LEAVE_REFUSAL_CODES.overlaps
		? "overlaps"
		: "failed";
};
