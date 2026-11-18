import { z } from "zod";

/** "yyyy-MM-dd": the first day the timeline shows. */
const ISO_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** How many weeks the timeline shows at once: one, two or four. */
export const TIMELINE_VIEWS = ["week", "two", "four"] as const;

const searchSchema = z.object({
	/** The Department whose schedules are shown; the page names it in every link. */
	department: z.string().min(1).optional().catch(undefined),
	/** The first day shown; absent means the Monday of today's week. */
	from: z.string().regex(ISO_DAY_PATTERN).optional().catch(undefined),
	/** How many weeks are shown; absent means one week. */
	view: z.enum(TIMELINE_VIEWS).optional().catch(undefined),
	/** A schedule shown alone; absent means every schedule. */
	schedule: z.string().min(1).optional().catch(undefined),
});

export type TimelineSearch = z.infer<typeof searchSchema>;

/**
 * The department timeline's search: every key optional here, so a link
 * without the Department shows the page's problem line instead of failing
 * the route, as `parseMonthSearch` does.
 */
export const parseTimelineSearch = (
	search: Record<string, unknown>
): TimelineSearch => searchSchema.parse(search);
