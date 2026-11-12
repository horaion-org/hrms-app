import type { HistoryState } from "@tanstack/react-router";
import { z } from "zod";

const stateSchema = z.object({
	/** The weeks the last month run refused, by Monday, with the API's error code. */
	refusedWeeks: z.record(z.string(), z.string()),
});

/** The refused weeks the previous page passed in history state; anything else reads as none. */
export const refusedWeeksFrom = (state: unknown): Record<string, string> => {
	const parsed = stateSchema.safeParse(state);
	return parsed.success ? parsed.data.refusedWeeks : {};
};

/**
 * Carries a month run's refused weeks to the month page in history state,
 * which stays with this tab and never reaches a URL, a server log or web
 * storage, so a reload shows each week as it is.
 */
export const withRefusedWeeks =
	(
		refusedWeeks: Record<string, string>
	): ((previous: HistoryState) => HistoryState) =>
	(previous) => ({ ...previous, refusedWeeks });
