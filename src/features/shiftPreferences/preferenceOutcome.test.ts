import { describe, expect, it } from "vitest";
import {
	FIXTURE_WEEK,
	fixtureOutcomes,
} from "@/features/shiftPreferences/fixtures";
import {
	OUTCOME_TONES,
	outcomeLabelKey,
	outcomeOfDay,
	outcomesByMemberDay,
	preferredShiftsText,
	reasonLabelKey,
} from "@/features/shiftPreferences/preferenceOutcome";

describe("preference outcome", () => {
	it("given_eachOutcome_when_toned_then_metIsSuccessNotMetWarningNotConsideredNeutral", () => {
		expect(OUTCOME_TONES).toEqual({
			MET: "success",
			NOT_MET: "warning",
			NOT_CONSIDERED: "neutral",
		});
	});

	it("given_anOutcomeAndAReason_when_worded_then_namesTheirKeys", () => {
		expect(outcomeLabelKey("NOT_MET")).toBe("shiftPreferences.outcome.NOT_MET");
		expect(reasonLabelKey("ON_LEAVE")).toBe(
			"shiftPreferences.notConsidered.ON_LEAVE"
		);
	});

	it("given_severalShifts_when_phrased_then_readsAsAnyOneOfThem", () => {
		expect(preferredShiftsText(["Morning", "Late"], "en")).toBe(
			"Morning or Late"
		);
		expect(preferredShiftsText(["Morning"], "en")).toBe("Morning");
	});

	it("given_aRostersOutcomes_when_looked_up_then_findsEachPersonsDay", () => {
		const lookup = outcomesByMemberDay(fixtureOutcomes());

		expect(outcomeOfDay(lookup, "m-1", FIXTURE_WEEK)?.outcome).toBe("MET");
		expect(outcomeOfDay(lookup, "m-1", "2026-11-25")?.reason).toBe("ON_LEAVE");
	});

	it("given_aDayWithoutAPreferenceOrAFormerMember_when_looked_up_then_findsNothing", () => {
		const lookup = outcomesByMemberDay(fixtureOutcomes());

		expect(outcomeOfDay(lookup, "m-1", "2026-11-29")).toBeUndefined();
		expect(outcomeOfDay(lookup, undefined, FIXTURE_WEEK)).toBeUndefined();
		expect(outcomeOfDay(undefined, "m-1", FIXTURE_WEEK)).toBeUndefined();
	});
});
