import { ApiProblemError } from "@/common/problem";

/** Why a roster change, or its undo, didn't go through: one message each. */
export type RosterChangeRefusal =
	| "revision"
	| "checksChanged"
	| "notEditable"
	| "refused"
	| "undoBlocked"
	| "forbidden"
	| "failed";

/**
 * The roster-change refusals of the API, as `"<status> <errorCode>"`, each
 * named once. A stale revision reloads the roster; anything unknown is a
 * plain failure the person may retry.
 */
const REFUSALS: Readonly<Record<string, RosterChangeRefusal>> = {
	"409 ROSTER_REVISION_CONFLICT": "revision",
	"409 ROSTER_CHECKS_CHANGED": "checksChanged",
	"400 ROSTER_CHECKS_NOT_ACKNOWLEDGED": "checksChanged",
	"400 ROSTER_CHANGE_REMARK_REQUIRED": "checksChanged",
	"409 SCHEDULE_ROSTER_NOT_EDITABLE": "notEditable",
	"422 ROSTER_CHANGE_REFUSED": "refused",
	"409 ROSTER_CHANGE_NOT_UNDOABLE": "undoBlocked",
	"404 ROSTER_CHANGE_NOT_FOUND": "undoBlocked",
};

/** Which message a failed change or undo shows. Pure. */
export const rosterChangeRefusal = (error: unknown): RosterChangeRefusal => {
	if (!(error instanceof ApiProblemError)) return "failed";
	if (error.status === 403) return "forbidden";
	return REFUSALS[`${error.status} ${error.errorCode ?? ""}`] ?? "failed";
};
