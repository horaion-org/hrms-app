import type { BadgeTone } from "@/components/ui/Badge";
import type { TimelineView } from "@/features/scheduling/timeline/timeline";

/** The Staff column's width, shared by the bars and the grid so their day columns line up. */
const STAFF_COLUMN_WIDTH = "12rem";

/** The grid columns of the timeline: the Staff column, then one per day shown. */
export const timelineColumns = (dayCount: number): string =>
	`${STAFF_COLUMN_WIDTH} repeat(${dayCount}, minmax(0, 1fr))`;

/** A schedule's status dot, coloured as its status badge is. */
export const statusDotLooks: Record<BadgeTone, string> = {
	success: "bg-success-700",
	warning: "bg-warning-700",
	error: "bg-error-700",
	neutral: "bg-neutral-500",
};

/** What a shift tile shows in each view: its time and name, its name, or its initial. */
export const shiftTextOfView: Record<
	TimelineView,
	"timeAndName" | "name" | "initial"
> = { week: "timeAndName", two: "name", four: "initial" };
