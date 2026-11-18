import type { BadgeTone } from "@/components/ui/Badge";
import type { TimelineView } from "@/features/scheduling/timeline/timeline";

/** The Staff column of the timeline's table, as the roster grid's: the bar lanes' label and each person. */
export const staffCellClasses = "bg-neutral-50 px-3 py-2 text-left";

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

/** Whether the Staff cell shows the avatar and the hours in the window, as the roster grid does; four weeks has no room. */
export const staffDetailsShown: Record<TimelineView, boolean> = {
	week: true,
	two: true,
	four: false,
};
