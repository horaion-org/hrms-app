import { z } from "zod";
import type { IssuesAbout } from "@/features/scheduling/roster/rosterMarks";
import { mondayOf } from "@/features/scheduling/schedules";

const isMonday = (date: string): boolean => mondayOf(date) === date;

/** The lists the roster's side panel opens on its own, without a chosen day. */
export const ROSTER_PANELS = [
	"issues",
	"changes",
	"details",
	"approval",
] as const;

export type RosterPanel = (typeof ROSTER_PANELS)[number];

const searchSchema = z.object({
	week: z.iso.date().refine(isMonday).optional().catch(undefined),
	/** The one day shown below `md`; today, else the week's first day, when left out (`shownDayOf`). */
	day: z.iso.date().optional().catch(undefined),
	panel: z.enum(ROSTER_PANELS).optional().catch(undefined),
	/** A chosen day, as `rosterCellKey` names it: "{membershipId}|{date}". */
	cell: z
		.string()
		.regex(/^[^|]+\|\d{4}-\d{2}-\d{2}$/)
		.optional()
		.catch(undefined),
	/** The Issues list opened from a member's row header: that member's issues only, by membership. */
	member: z.string().min(1).optional().catch(undefined),
	/** The Issues list opened from a day's header: that day's issues only. */
	date: z.iso.date().optional().catch(undefined),
});

/**
 * A roster's view that belongs in the URL, so it survives a reload and can
 * be linked: the week shown (its Monday; this week when left out), the one
 * day a phone shows (`day`), and what the side panel shows, either one list
 * (`panel`) or a chosen day (`cell`).
 * A chosen day wins when both are given. The Issues list may be narrowed to
 * the header it was opened from: one member (`member`), else one day (`date`).
 */
export type RosterSearch = z.infer<typeof searchSchema>;

/** The list named, with the header it was opened from when it is Issues: a member wins over a day. */
const listOf = ({
	panel,
	member,
	date,
}: Pick<RosterSearch, "panel" | "member" | "date">): RosterSearch => {
	if (panel !== "issues") return panel === undefined ? {} : { panel };
	if (member !== undefined) return { panel, member };
	return date === undefined ? { panel } : { panel, date };
};

/** Reads the URL's roster view, dropping anything it does not recognise. */
export const parseRosterSearch = (
	search: Record<string, unknown>
): RosterSearch => {
	const { week, day, cell, ...list } = searchSchema.parse(search);
	return {
		...(week === undefined ? {} : { week }),
		...(day === undefined ? {} : { day }),
		...(cell !== undefined ? { cell } : listOf(list)),
	};
};

/** The header the Issues list was opened from, as the view names it; none for all of Issues. */
export const issuesAboutOf = ({
	member,
	date,
}: Pick<RosterSearch, "member" | "date">): IssuesAbout | undefined => {
	if (member !== undefined) return { kind: "member", membershipId: member };
	return date === undefined ? undefined : { kind: "date", date };
};
