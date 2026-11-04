import { linkOptions } from "@tanstack/react-router";
import type { Schedule } from "@/features/scheduling/schedules/api";
import type { ScheduleStep } from "@/features/scheduling/steps";

/** What View needs of a schedule to know where to open it. */
type ViewedSchedule = Pick<Schedule, "scheduleId" | "departmentId" | "status">;

/** The wizard's Setup for one schedule, as a link's props. */
export type ScheduleSetupLink = {
	to: "/scheduling/new";
	search: { step: ScheduleStep; scheduleId: string; departmentId: string };
};

/** Where View opens a schedule, as a link's props. */
export type ScheduleViewLink =
	| ScheduleSetupLink
	| {
			to: "/scheduling/$scheduleId";
			params: { scheduleId: string };
	  };

/**
 * A schedule's Setup in the wizard: a draft carries on there, and any other
 * status shows its setup, shifts and constraints read-only.
 */
export const scheduleSetupLink = ({
	scheduleId,
	departmentId,
}: Pick<Schedule, "scheduleId" | "departmentId">): ScheduleSetupLink =>
	linkOptions({
		to: "/scheduling/new",
		search: { step: "setup", scheduleId, departmentId },
	});

/**
 * A DRAFT reopens at the wizard's Setup to carry on; any other status opens
 * its roster, named by the schedule's id alone.
 */
export const scheduleViewLink = (schedule: ViewedSchedule): ScheduleViewLink =>
	schedule.status === "DRAFT"
		? scheduleSetupLink(schedule)
		: linkOptions({
				to: "/scheduling/$scheduleId",
				params: { scheduleId: schedule.scheduleId },
			});
