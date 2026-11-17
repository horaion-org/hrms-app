import { describe, expect, it } from "vitest";
import {
	stepCompletion,
	type StepFacts,
} from "@/features/scheduling/createSchedule/stepCompletion";

const NEW_DRAFT: StepFacts = {
	saved: false,
	frozen: false,
};

describe("stepCompletion", () => {
	it("given_nothingSaved_when_judged_then_noStepIsDone", () => {
		expect(stepCompletion(NEW_DRAFT)).toEqual({
			setup: false,
			generate: false,
		});
	});

	it("given_aSavedDraft_when_reopenedAtSetup_then_onlySetupIsDone", () => {
		expect(stepCompletion({ ...NEW_DRAFT, saved: true })).toEqual({
			setup: true,
			generate: false,
		});
	});

	it("given_aFrozenSchedule_when_reopenedAtSetup_then_everyStepIsDone", () => {
		expect(stepCompletion({ ...NEW_DRAFT, saved: true, frozen: true })).toEqual(
			{
				setup: true,
				generate: true,
			}
		);
	});
});
