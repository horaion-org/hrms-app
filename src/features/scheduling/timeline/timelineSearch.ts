import { z } from "zod";
import {
	DAYS_IN_VIEW,
	type TimelineView,
} from "@/features/scheduling/timeline/timeline";

const VIEWS = Object.keys(DAYS_IN_VIEW) as [
	TimelineView,
	...Array<TimelineView>,
];

const searchSchema = z.object({
	/** The Department whose schedules are shown; the page names it in every link. */
	department: z.string().min(1).optional().catch(undefined),
	/** The first day shown (ISO date); absent is the Monday of today's week. */
	from: z.iso.date().optional().catch(undefined),
	/** How many weeks are shown; absent is one week. */
	view: z.enum(VIEWS).optional().catch(undefined),
	/** The one schedule shown in full; absent shows all. */
	schedule: z.string().min(1).optional().catch(undefined),
});

export type TimelineSearch = z.infer<typeof searchSchema>;

/**
 * The department timeline's search, as the month page's: every key optional,
 * so a link without the Department shows the page's problem line instead of
 * failing the route, and an unreadable value reads as absent.
 */
export const parseTimelineSearch = (
	search: Record<string, unknown>
): TimelineSearch => searchSchema.parse(search);
