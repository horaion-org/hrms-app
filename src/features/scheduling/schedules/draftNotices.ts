import type { ScheduleStatus } from "@/features/scheduling/schedules/api";
import type { ScheduleState } from "@/features/scheduling/schedules/useSchedule";

/*
 * The copy the week wizard explains a saved draft with: why it can't be
 * shown, and what a frozen schedule's notice says.
 */

/** The copy a draft that can't be shown is explained with. */
export const draftProblemKey = (
	status: ScheduleState["status"]
):
	| "scheduling.draft.loading"
	| "scheduling.draft.missing"
	| "scheduling.draft.failed" => {
	if (status === "error") return "scheduling.draft.failed";
	if (status === "hidden" || status === "missing")
		return "scheduling.draft.missing";
	return "scheduling.draft.loading";
};

/** What a frozen schedule's notice says: generation requested, failed, or done (also once decided). */
export const frozenNoticeKey = (
	status: ScheduleStatus
):
	| "scheduling.draft.generationRequested"
	| "scheduling.draft.generated"
	| "scheduling.draft.generationFailed" => {
	if (status === "GENERATION_REQUESTED")
		return "scheduling.draft.generationRequested";
	if (status === "GENERATION_FAILED")
		return "scheduling.draft.generationFailed";
	return "scheduling.draft.generated";
};
