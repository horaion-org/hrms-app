/** The Create Schedule steps in order; the URL names the current one. */
export const SCHEDULE_STEPS = [
	"setup",
	"shifts",
	"constraints",
	"forecast",
	"generate",
] as const;

export type ScheduleStep = (typeof SCHEDULE_STEPS)[number];

export const isScheduleStep = (value: unknown): value is ScheduleStep =>
	SCHEDULE_STEPS.some((step) => step === value);
