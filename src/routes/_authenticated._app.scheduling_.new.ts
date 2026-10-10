import { createFileRoute } from "@tanstack/react-router";
import { isScheduleStep, type ScheduleStep } from "@/features/scheduling/steps";
import { CreateSchedule } from "@/pages/CreateSchedule";

/**
 * The wizard's step and, once Setup is done, the saved draft it works on:
 * the schedule and its department, whose routes name it.
 */
export type CreateScheduleSearch = {
	step?: ScheduleStep;
	scheduleId?: string;
	departmentId?: string;
};

const isId = (value: unknown): value is string =>
	typeof value === "string" && value.trim() !== "";

export const Route = createFileRoute("/_authenticated/_app/scheduling_/new")({
	validateSearch: (search: Record<string, unknown>): CreateScheduleSearch => {
		const { step, scheduleId, departmentId } = search;
		return {
			...(isScheduleStep(step) ? { step } : {}),
			...(isId(scheduleId) ? { scheduleId } : {}),
			...(isId(departmentId) ? { departmentId } : {}),
		};
	},
	component: CreateSchedule,
});
