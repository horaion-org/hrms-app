import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { PROFILE_REFUSAL_CODES } from "@/features/people/profileRefusal";
import {
	memberShiftPreferenceRefusal,
	SHIFT_PREFERENCE_REFUSAL_CODES,
	shiftPreferenceRefusal,
} from "@/features/shiftPreferences/shiftPreferenceRefusal";

/** Echoes the key, so a test reads which copy was chosen. */
const t = ((key: string) => key) as unknown as TFunction;

/** A refusal as the API would send it, from `"<status> <code>"`. */
const refusalOf = (code: string): ApiProblemError => {
	const [status, errorCode] = code.split(" ");
	return new ApiProblemError({
		message: "API says no",
		status: Number(status),
		errorCode,
		fieldErrors: [],
		reason: "http",
	});
};

describe("shift preference refusal", () => {
	it.each([
		[
			SHIFT_PREFERENCE_REFUSAL_CODES.dateOutOfRange,
			"shiftPreferences.dialog.dateOutOfRange",
		],
		[SHIFT_PREFERENCE_REFUSAL_CODES.tooManyShifts, "shiftPreferences.limit"],
		[
			SHIFT_PREFERENCE_REFUSAL_CODES.shiftNotChoosable,
			"shiftPreferences.dialog.shiftNotChoosable",
		],
	])("given_%s_when_mapped_then_saysItsOwnAlert", (code, message) => {
		expect(shiftPreferenceRefusal(refusalOf(code), 5, t).message).toBe(message);
	});

	it("given_aNetworkFailure_when_mapped_then_saysItFailed", () => {
		expect(shiftPreferenceRefusal(new Error("offline"), 5, t).message).toBe(
			"shiftPreferences.dialog.failed"
		);
	});

	it("given_aRefusalThatIsNotAboutTheDay_when_mappedForTheCallersOwnDay_then_saysTheirOwnCopy", () => {
		expect(
			shiftPreferenceRefusal(refusalOf("403 FORBIDDEN"), 5, t).message
		).toBe("shiftPreferences.dialog.forbidden");
	});
});

describe("member shift preference refusal", () => {
	it.each([
		[
			SHIFT_PREFERENCE_REFUSAL_CODES.dateOutOfRange,
			"shiftPreferences.dialog.dateOutOfRange",
		],
		[SHIFT_PREFERENCE_REFUSAL_CODES.tooManyShifts, "shiftPreferences.limit"],
		[
			SHIFT_PREFERENCE_REFUSAL_CODES.shiftNotChoosable,
			"shiftPreferences.dialog.shiftNotChoosable",
		],
		[PROFILE_REFUSAL_CODES.profileNotFound, "shiftPreferences.member.notFound"],
		["403 FORBIDDEN", "shiftPreferences.member.forbidden"],
	])("given_%s_when_mapped_then_saysItsOwnAlert", (code, message) => {
		expect(memberShiftPreferenceRefusal(refusalOf(code), 5, t).message).toBe(
			message
		);
	});

	it("given_aNetworkFailure_when_mapped_then_saysTheMembersDayWasNotSaved", () => {
		expect(
			memberShiftPreferenceRefusal(new Error("offline"), 5, t).message
		).toBe("shiftPreferences.member.saveFailed");
	});
});
