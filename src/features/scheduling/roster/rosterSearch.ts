import { z } from "zod";
import { mondayOf } from "@/features/scheduling/schedules";

const isMonday = (date: string): boolean => mondayOf(date) === date;

/** The lists the roster's side panel opens on its own, without a chosen day. */
export const ROSTER_PANELS = ["issues", "changes", "details"] as const;

export type RosterPanel = (typeof ROSTER_PANELS)[number];

const searchSchema = z.object({
	week: z.iso.date().refine(isMonday).optional().catch(undefined),
	panel: z.enum(ROSTER_PANELS).optional().catch(undefined),
	/** A chosen day, as `rosterCellKey` names it: "{membershipId}|{date}". */
	cell: z
		.string()
		.regex(/^[^|]+\|\d{4}-\d{2}-\d{2}$/)
		.optional()
		.catch(undefined),
});

/**
 * A roster's view that belongs in the URL, so it survives a reload and can
 * be linked: the week shown (its Monday; this week when left out) and what
 * the side panel shows, either one list (`panel`) or a chosen day (`cell`).
 * A chosen day wins when both are given.
 */
export type RosterSearch = z.infer<typeof searchSchema>;

/** Reads the URL's roster view, dropping anything it does not recognise. */
export const parseRosterSearch = (
	search: Record<string, unknown>
): RosterSearch => {
	const { week, panel, cell } = searchSchema.parse(search);
	return {
		...(week === undefined ? {} : { week }),
		...(cell !== undefined ? { cell } : panel === undefined ? {} : { panel }),
	};
};
