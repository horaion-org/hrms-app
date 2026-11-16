import { z } from "zod";

/*
 * Home's own part of the URL: which of its two views is open, so a reload
 * or a link keeps it. The header's Branch is the app shell's part.
 */

/** Home's views, in tab order: the to-do list, and the Overview across units. */
export const HOME_TABS = ["needs-you", "overview"] as const;

export type HomeTab = (typeof HOME_TABS)[number];

const searchSchema = z.object({
	tab: z.enum(HOME_TABS).optional().catch(undefined),
});

export type HomeSearch = z.infer<typeof searchSchema>;

/** Reads the view the URL names, dropping anything it does not recognise. */
export const parseHomeSearch = (
	search: Record<string, unknown>
): HomeSearch => {
	const { tab } = searchSchema.parse(search);
	return tab === undefined ? {} : { tab };
};

/**
 * The view Home opens on. Without the Overview in reach it is the to-do
 * list. Otherwise the URL's choice wins; with none, someone who builds
 * rosters starts on what needs them, and someone who only looks across
 * units starts on the Overview.
 */
export const homeTabOf = (
	requested: HomeTab | undefined,
	reach: { overview: boolean; buildsRosters: boolean }
): HomeTab => {
	if (!reach.overview) return "needs-you";
	return requested ?? (reach.buildsRosters ? "needs-you" : "overview");
};
