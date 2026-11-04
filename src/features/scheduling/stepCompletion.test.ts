import { describe, expect, it } from "vitest";
import {
	stepCompletion,
	type StepFacts,
} from "@/features/scheduling/stepCompletion";
import { SCHEDULE_STEPS } from "@/features/scheduling/steps";

const NEW_DRAFT: StepFacts = {
	saved: false,
	frozen: false,
	tickedShiftCount: 0,
	tickedConstraintCount: 0,
	currentIndex: 0,
};

describe("stepCompletion", () => {
	it("given_nothingSaved_when_judged_then_noStepIsDone", () => {
		expect(stepCompletion(NEW_DRAFT)).toEqual({
			setup: false,
			shifts: false,
			constraints: false,
			forecast: false,
			generate: false,
		});
	});

	it("given_aSavedDraftWithTicks_when_reopenedAtSetup_then_itsDataStepsAreDone", () => {
		expect(
			stepCompletion({
				...NEW_DRAFT,
				saved: true,
				tickedShiftCount: 2,
				tickedConstraintCount: 1,
			})
		).toEqual({
			setup: true,
			shifts: true,
			constraints: true,
			forecast: false,
			generate: false,
		});
	});

	it("given_constraintsPassedWithNoneTicked_when_judged_then_constraintsIsNotDone", () => {
		expect(
			stepCompletion({
				...NEW_DRAFT,
				saved: true,
				tickedShiftCount: 1,
				currentIndex: SCHEDULE_STEPS.indexOf("forecast"),
			}).constraints
		).toBe(false);
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

	it("given_aFrozenSchedule_when_reopenedAtSetup_then_forecastAndGenerateAreDone", () => {
		expect(
			stepCompletion({
				...NEW_DRAFT,
				saved: true,
				frozen: true,
				tickedShiftCount: 3,
			})
		).toEqual({
			setup: true,
			shifts: true,
			constraints: false,
			forecast: true,
			generate: true,
		});
	});
});
