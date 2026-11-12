import type { SchedulePeriod } from "@/features/scheduling/periods";
import type { Schedule } from "@/features/scheduling/schedules/api";
import type { ScheduleActionId } from "@/features/scheduling/schedules/scheduleActions";

/*
 * Weeks are published in order (ADR-0074 in the API): while an earlier
 * generated week of the Department still waits for its decision, this
 * week's Publish waits too. The API decides it and refuses an out-of-order
 * publish itself; the app only shows it.
 */

/** The earlier week this schedule's Publish waits for, if the API says one; undefined otherwise. */
export const publishWaitsFor = (
	schedule: Pick<Schedule, "publication">
): SchedulePeriod | undefined => {
	const week = schedule.publication.waitingForWeek;
	return week ? { start: week.periodStart, end: week.periodEnd } : undefined;
};

/** The actions that publish, directly or at an approval's last step, or send the roster towards it. */
const PUBLISHING_ACTIONS: ReadonlySet<ScheduleActionId> =
	new Set<ScheduleActionId>(["publish", "submit", "approveAndPublish"]);

/** Whether the page's primary action publishes (or submits, or approves the last step) and so waits too. */
export const actionWaitsForEarlierWeek = (
	actionId: ScheduleActionId
): boolean => PUBLISHING_ACTIONS.has(actionId);
