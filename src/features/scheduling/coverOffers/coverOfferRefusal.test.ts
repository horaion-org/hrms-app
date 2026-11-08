import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { coverOfferRefusal } from "@/features/scheduling/coverOffers/coverOfferRefusal";

const problem = (status: number, errorCode?: string): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status,
		errorCode,
		fieldErrors: [],
		retryAfterSeconds: undefined,
		reason: "http",
	});

describe("coverOfferRefusal", () => {
	it.each([
		[409, "COVER_OFFER_STALE", "stale"],
		[409, "COVER_OFFER_NOT_OPEN", "notOpen"],
		[409, "COVER_OFFER_ALREADY_OPEN", "alreadyOpen"],
		[409, "COVER_OFFER_GROUP_FULL", "groupFull"],
		[403, "OWN_COVER_OFFER_DENIED", "ownOffer"],
		[422, "COVER_OFFER_ROSTER_NOT_PUBLISHED", "notPublished"],
		[404, "COVER_OFFER_NOT_FOUND", "notFound"],
		[409, "ROSTER_REVISION_CONFLICT", "revision"],
		[400, "ROSTER_CHECKS_NOT_ACKNOWLEDGED", "checksChanged"],
		[422, "ROSTER_CHANGE_REFUSED", "refused"],
		[500, "INTERNAL", "failed"],
	] as const)("given_%i %s_when_read_then_%s", (status, code, refusal) => {
		expect(coverOfferRefusal(problem(status, code))).toBe(refusal);
	});

	it("given_aNetworkFailure_when_read_then_failed", () => {
		expect(coverOfferRefusal(new Error("offline"))).toBe("failed");
	});
});
