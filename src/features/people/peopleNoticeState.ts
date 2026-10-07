import type { HistoryState } from "@tanstack/react-router";
import { z } from "zod";

const noticeSchema = z.object({
	peopleNotice: z.object({
		/** What happened to the person: added, saved, or their access changed. */
		kind: z.enum(["added", "saved", "deactivated", "reactivated"]),
		name: z.string().min(1),
		/** Set when the person was added or saved but their system role was not changed. */
		roleNotAssigned: z.boolean(),
		/** Set when the person was saved but the changes to their skills were not. */
		skillsNotSaved: z.boolean().optional(),
	}),
});

/** What a People page confirms after a change to a person. */
export type PeopleNotice = z.infer<typeof noticeSchema>["peopleNotice"];

/** The notice the previous page passed in history state; anything else reads as none. */
export const peopleNoticeFrom = (state: unknown): PeopleNotice | undefined => {
	const parsed = noticeSchema.safeParse(state);
	return parsed.success ? parsed.data.peopleNotice : undefined;
};

/**
 * Carries the notice to the next page in history state, which stays with
 * this tab and never reaches a URL, a server log or web storage.
 */
export const withPeopleNotice =
	(notice: PeopleNotice): ((previous: HistoryState) => HistoryState) =>
	(previous) => ({ ...previous, peopleNotice: notice });
