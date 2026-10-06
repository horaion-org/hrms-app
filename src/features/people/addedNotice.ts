import type { HistoryState } from "@tanstack/react-router";
import { z } from "zod";

const addedSchema = z.object({
	addedEmployee: z.object({
		name: z.string().min(1),
		/** Set when the person was added but the chosen system role was not assigned. */
		roleNotAssigned: z.boolean(),
	}),
});

/** What the People page confirms after a person was added. */
export type AddedNotice = z.infer<typeof addedSchema>["addedEmployee"];

/** The notice the Add employee page passed in history state; anything else reads as none. */
export const addedNoticeFrom = (state: unknown): AddedNotice | undefined => {
	const parsed = addedSchema.safeParse(state);
	return parsed.success ? parsed.data.addedEmployee : undefined;
};

/**
 * Carries the notice to the People page in history state, which stays with
 * this tab and never reaches a URL, a server log or web storage.
 */
export const withAddedNotice =
	(notice: AddedNotice): ((previous: HistoryState) => HistoryState) =>
	(previous) => ({ ...previous, addedEmployee: notice });
