import type { Schedule } from "@/features/scheduling/schedules/api";

/**
 * Where a schedule's roster stands on its decision, as the panel shows it:
 * waiting for one, or decided by someone at a time (with a reason when
 * rejected). `null` while there is no roster to decide.
 */
export type ScheduleDecision =
	| { kind: "pending" }
	| {
			kind: "published" | "rejected";
			/** Null once the decider has left the company, or when the API didn't name them. */
			decidedBy: string | null;
			decidedAt: string | null;
			reason: string | null;
	  };

/** Reads the decision off a schedule; it never infers one from anything but the status the API answered. */
export const scheduleDecision = (
	schedule: Schedule
): ScheduleDecision | null => {
	if (schedule.status === "GENERATED") return { kind: "pending" };
	if (schedule.status !== "PUBLISHED" && schedule.status !== "REJECTED")
		return null;
	return {
		kind: schedule.status === "PUBLISHED" ? "published" : "rejected",
		decidedBy: schedule.decidedBy?.displayName ?? null,
		decidedAt: schedule.decidedAt,
		reason: schedule.status === "REJECTED" ? schedule.rejectionReason : null,
	};
};
