import { createFileRoute } from "@tanstack/react-router";
import { isScheduleStep, type ScheduleStep } from "@/features/scheduling/steps";
import { CreateSchedule } from "@/pages/CreateSchedule";

export const Route = createFileRoute("/_authenticated/_app/scheduling_/new")({
	validateSearch: (search: Record<string, unknown>): { step?: ScheduleStep } =>
		isScheduleStep(search["step"]) ? { step: search["step"] } : {},
	component: CreateSchedule,
});
