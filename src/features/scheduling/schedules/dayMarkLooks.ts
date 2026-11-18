import type { DayMark } from "@/features/scheduling/schedules/departmentCards";

/** A day's bar on a Department card's strip and its swatch in the legend. */
export const dayMarkLooks: Record<DayMark, string> = {
	published: "bg-ink-blue-700",
	toReview: "bg-warning-200",
	none: "bg-neutral-400",
};
