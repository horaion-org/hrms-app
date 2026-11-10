import type { BadgeTone } from "@/components/ui/Badge";
import type { ScheduleStatus } from "@/features/scheduling/schedules/api";

/** The badge tone of each schedule status, shared by the overview and a schedule's roster. */
export const scheduleStatusTones: Record<ScheduleStatus, BadgeTone> = {
	DRAFT: "neutral",
	GENERATION_REQUESTED: "warning",
	// Generated and not yet decided: someone still has to publish or reject it.
	GENERATED: "warning",
	GENERATION_FAILED: "error",
	PUBLISHED: "success",
	REJECTED: "error",
	UNKNOWN: "neutral",
};
