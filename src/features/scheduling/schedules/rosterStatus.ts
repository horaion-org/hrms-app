import type { BadgeTone } from "@/components/ui/Badge";
import type { Schedule } from "@/features/scheduling/schedules/api";
import { scheduleStatusTones } from "@/features/scheduling/schedules/scheduleStatusTones";

/*
 * How a schedule's status reads on its roster and the Schedules tab: in the
 * month page's words where it has them. Each schedule is published on its
 * own (API ADR-0130), so nothing here waits for another week.
 */

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

/** The roster header's status badge: its status's word (`statusLabelKey`) in its status's tone. */
export const rosterStatusBadge = (
	schedule: Pick<Schedule, "status">
): { labelKey: ReturnType<typeof statusLabelKey>; tone: BadgeTone } => ({
	labelKey: statusLabelKey(schedule.status),
	tone: scheduleStatusTones[schedule.status],
});
