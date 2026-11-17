import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import {
	refusalNextStep,
	rosterChangeRefusal,
} from "@/features/scheduling/rosterChanges/rosterChangeRefusal";

const problem = (status: number, errorCode?: string): ApiProblemError =>
	new ApiProblemError({
		message: "Refused",
		status,
		errorCode,
		fieldErrors: [],
		retryAfterSeconds: undefined,
		reason: "http",
	});

describe("rosterChangeRefusal", () => {
	it.each([
		[409, "ROSTER_REVISION_CONFLICT", "revision"],
		[409, "ROSTER_CHECKS_CHANGED", "checksChanged"],
		[400, "ROSTER_CHANGE_REMARK_REQUIRED", "checksChanged"],
		[409, "SCHEDULE_ROSTER_NOT_EDITABLE", "notEditable"],
		[422, "ROSTER_CHANGE_REFUSED", "refused"],
		[409, "ROSTER_CHANGE_NOT_UNDOABLE", "undoBlocked"],
		[409, "ROSTER_CHANGE_FROM_LEAVE", "fromLeave"],
		[400, "INVALID_ROSTER_CHANGE", "invalid"],
		[409, "ROSTER_CHANGE_FROM_OFFER", "fromOffer"],
		[403, "FORBIDDEN", "forbidden"],
		[500, "INTERNAL", "failed"],
	] as const)("given_%i %s_when_read_then_%s", (status, code, refusal) => {
		expect(rosterChangeRefusal(problem(status, code))).toBe(refusal);
	});

	it("given_aNetworkFailure_when_read_then_failed", () => {
		expect(rosterChangeRefusal(new Error("offline"))).toBe("failed");
	});
});

describe("refusalNextStep", () => {
	it.each([
		["revision", "reload"],
		["failed", "tryAgain"],
		["checksChanged", "tryAgain"],
		["invalid", undefined],
		["notEditable", undefined],
		["fromOffer", undefined],
		["forbidden", undefined],
	] as const)("given_%s_when_read_then_%s", (refusal, nextStep) => {
		expect(refusalNextStep(refusal)).toBe(nextStep);
	});
});
