import type { HistoryState } from "@tanstack/react-router";
import { z } from "zod";

const noticeSchema = z.object({
	schedulingNotice: z.object({
		/** What happened to the schedule; for now only that its generation was requested. */
		kind: z.enum(["generated"]),
		name: z.string().min(1),
	}),
});

/** What the Scheduling page confirms after the wizard leaves it. */
export type SchedulingNotice = z.infer<typeof noticeSchema>["schedulingNotice"];

/** The notice the previous page passed in history state; anything else reads as none. */
export const schedulingNoticeFrom = (
	state: unknown
): SchedulingNotice | undefined => {
	const parsed = noticeSchema.safeParse(state);
	return parsed.success ? parsed.data.schedulingNotice : undefined;
};

/**
 * Carries the notice to the next page in history state, which stays with
 * this tab and never reaches a URL, a server log or web storage.
 */
export const withSchedulingNotice =
	(notice: SchedulingNotice): ((previous: HistoryState) => HistoryState) =>
	(previous) => ({ ...previous, schedulingNotice: notice });
