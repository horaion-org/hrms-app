import { ApiProblemError } from "@/common/problem";
import { refusalCodeOf } from "@/common/refusal";

/** Why a roster change, or its undo, didn't go through: one message each. */
export type RosterChangeRefusal =
	| "revision"
	| "checksChanged"
	| "notEditable"
	| "refused"
	| "undoBlocked"
	| "fromLeave"
	| "fromOffer"
	| "invalid"
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
	"409 ROSTER_CHANGE_FROM_LEAVE": "fromLeave",
	"404 ROSTER_CHANGE_NOT_FOUND": "undoBlocked",
	"409 ROSTER_CHANGE_FROM_OFFER": "fromOffer",
	"400 INVALID_ROSTER_CHANGE": "invalid",
};

/** Which message a failed change or undo shows. Pure. */
export const rosterChangeRefusal = (error: unknown): RosterChangeRefusal => {
	if (!(error instanceof ApiProblemError)) return "failed";
	if (error.status === 403) return "forbidden";
	const code = refusalCodeOf(error);
	if (code === undefined) return "failed";
	return REFUSALS[code] ?? "failed";
};

/** What a refusal offers next: the roster read again, the same request again, or nothing. */
export type RefusalNextStep = "reload" | "tryAgain";

/**
 * What the person can do after a refusal: reload a roster that moved, try a
 * plain failure or changed checks again; nothing after a refusal that would
 * only be refused again (an invalid change, a roster not editable now). Pure.
 */
export const refusalNextStep = (
	refusal: RosterChangeRefusal
): RefusalNextStep | undefined => {
	if (refusal === "revision") return "reload";
	if (refusal === "failed" || refusal === "checksChanged") return "tryAgain";
	return undefined;
};
