import { describe, expect, it } from "vitest";
import {
	stepCompletion,
	type StepFacts,
} from "@/features/scheduling/stepCompletion";
import { SCHEDULE_STEPS } from "@/features/scheduling/steps";

const NEW_DRAFT: StepFacts = {
	saved: false,
	frozen: false,
	currentIndex: 0,
};

describe("stepCompletion", () => {
	it("given_nothingSaved_when_judged_then_noStepIsDone", () => {
		expect(stepCompletion(NEW_DRAFT)).toEqual({
			setup: false,
			forecast: false,
			generate: false,
		});
	});

	it("given_aSavedDraft_when_reopenedAtSetup_then_onlySetupIsDone", () => {
		expect(stepCompletion({ ...NEW_DRAFT, saved: true })).toEqual({
			setup: true,
			forecast: false,
			generate: false,
		});
	});

	it("given_theForecastStep_when_onItOrPastIt_then_doneOnlyOncePassed", () => {
		const at = (step: (typeof SCHEDULE_STEPS)[number]): boolean =>
			stepCompletion({
				...NEW_DRAFT,
				saved: true,
				currentIndex: SCHEDULE_STEPS.indexOf(step),
			}).forecast;

		expect(at("forecast")).toBe(false);
		expect(at("generate")).toBe(true);
	});

	it("given_aFrozenSchedule_when_reopenedAtSetup_then_everyStepIsDone", () => {
		expect(
			stepCompletion({ ...NEW_DRAFT, saved: true, frozen: true })
		).toEqual({
			setup: true,
			forecast: true,
			generate: true,
		});
	});
});
