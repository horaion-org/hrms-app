import { SCHEDULE_STEPS, type ScheduleStep } from "@/features/scheduling/steps";

/** What the wizard knows about a draft that decides which steps are done. */
export type StepFacts = {
	/** A draft is saved, so its setup was accepted. */
	saved: boolean;
	/** The schedule is past DRAFT: generation was requested, done or failed. */
	frozen: boolean;
	/** The step the person is on, as an index of `SCHEDULE_STEPS`. */
	currentIndex: number;
};

const FORECAST_INDEX = SCHEDULE_STEPS.indexOf("forecast");

/**
 * Which wizard steps have their work done, from the draft's data rather than
 * from where the person is. Forecast keeps nothing on the API yet, so it is
 * done once passed; Generate is done once the schedule is frozen.
 */
export const stepCompletion = ({
	saved,
	frozen,
	currentIndex,
}: StepFacts): Record<ScheduleStep, boolean> => ({
	setup: saved,
	forecast: frozen || currentIndex > FORECAST_INDEX,
	generate: frozen,
});
