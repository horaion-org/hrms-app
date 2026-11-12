import {
	type ApprovalInstance,
	SCHEDULE_PUBLICATION,
} from "@/features/approvals/api";
import {
	type OpenStep,
	openStepOf,
} from "@/features/approvals/approvalStanding";
import type { ScheduleMonthSummary } from "@/features/scheduling/months/api";

/**
 * The first week of the month whose schedule's publication waits on the
 * person, with its open step; undefined when none does. Matched by the
 * schedule's public id, as the approvals name their subject.
 */
export const weekWaitingOnMe = (
	summary: ScheduleMonthSummary,
	waitingOnMe: ReadonlyArray<ApprovalInstance>
): { periodStart: string; step: OpenStep } | undefined => {
	for (const week of summary.weeks) {
		const instance = waitingOnMe.find(
			(candidate) =>
				candidate.subjectType === SCHEDULE_PUBLICATION &&
				candidate.subjectId === week.scheduleId
		);
		const step = instance && openStepOf(instance);
		if (step) return { periodStart: week.periodStart, step };
	}
	return undefined;
};
