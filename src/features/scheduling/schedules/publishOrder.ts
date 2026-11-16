import type { BadgeTone } from "@/components/ui/Badge";
import type { SchedulePeriod } from "@/features/scheduling/periods";
import type { Schedule } from "@/features/scheduling/schedules/api";
import type { ScheduleActionId } from "@/features/scheduling/schedules/scheduleActions";
import { scheduleStatusTones } from "@/features/scheduling/schedules/scheduleStatusTones";

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

/**
 * The word for a schedule's status: "To review" on a generated week, the
 * same word as the month page; the status's own word otherwise.
 */
export const statusLabelKey = (
	status: Schedule["status"]
):
	| "scheduling.months.states.TO_REVIEW"
	| `scheduling.overview.statuses.${Exclude<Schedule["status"], "GENERATED">}` =>
	status === "GENERATED"
		? "scheduling.months.states.TO_REVIEW"
		: `scheduling.overview.statuses.${status}`;

/**
 * The roster header's status badge: "Tentative" (neutral) on a generated
 * week whose Publish waits, "To review" on the week under review, the same
 * words as the month page; the status as today otherwise.
 */
export const rosterStatusBadge = (
	schedule: Pick<Schedule, "status" | "publication">
): {
	labelKey:
		"scheduling.months.states.TENTATIVE" | ReturnType<typeof statusLabelKey>;
	tone: BadgeTone;
} =>
	schedule.status === "GENERATED" && publishWaitsFor(schedule)
		? { labelKey: "scheduling.months.states.TENTATIVE", tone: "neutral" }
		: {
				labelKey: statusLabelKey(schedule.status),
				tone: scheduleStatusTones[schedule.status],
			};
