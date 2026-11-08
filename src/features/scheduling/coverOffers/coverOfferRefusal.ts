import { ApiProblemError } from "@/common/problem";

/** Why sending, recording, withdrawing or answering an offer didn't go through: one message each. */
export type CoverOfferRefusal =
	| "stale"
	| "notOpen"
	| "alreadyOpen"
	| "groupFull"
	| "ownOffer"
	| "notPublished"
	| "revision"
	| "checksChanged"
	| "refused"
	| "notFound"
	| "failed";

/**
 * The cover offer refusals of the API, as `"<status> <errorCode>"`, each
 * named once. Creating an offer runs the roster change checks too, so their
 * codes read as they do for an edit. Anything unknown is a plain failure.
 */
const REFUSALS: Readonly<Record<string, CoverOfferRefusal>> = {
	"409 COVER_OFFER_STALE": "stale",
	"409 COVER_OFFER_NOT_OPEN": "notOpen",
	"409 COVER_OFFER_ALREADY_OPEN": "alreadyOpen",
	"409 COVER_OFFER_GROUP_FULL": "groupFull",
	"403 OWN_COVER_OFFER_DENIED": "ownOffer",
	"422 COVER_OFFER_ROSTER_NOT_PUBLISHED": "notPublished",
	"404 COVER_OFFER_NOT_FOUND": "notFound",
	"409 ROSTER_REVISION_CONFLICT": "revision",
	"409 ROSTER_CHECKS_CHANGED": "checksChanged",
	"400 ROSTER_CHECKS_NOT_ACKNOWLEDGED": "checksChanged",
	"400 ROSTER_CHANGE_REMARK_REQUIRED": "checksChanged",
	"422 ROSTER_CHANGE_REFUSED": "refused",
};

/** Which message a failed offer action shows. Pure. */
export const coverOfferRefusal = (error: unknown): CoverOfferRefusal => {
	if (!(error instanceof ApiProblemError)) return "failed";
	return REFUSALS[`${error.status} ${error.errorCode ?? ""}`] ?? "failed";
};
