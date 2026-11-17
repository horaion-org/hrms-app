import type { ScheduleStep } from "@/features/scheduling/steps";

/** What the wizard knows about a draft that decides which steps are done. */
export type StepFacts = {
	/** A draft is saved, so its setup was accepted. */
	saved: boolean;
	/** The schedule is past DRAFT: generation was requested, done or failed. */
	frozen: boolean;
};

/**
 * Which wizard steps have their work done, from the draft's data rather than
 * from where the person is. Generate is done once the schedule is frozen.
 */
export const stepCompletion = ({
	saved,
	frozen,
}: StepFacts): Record<ScheduleStep, boolean> => ({
	setup: saved,
	generate: frozen,
});
