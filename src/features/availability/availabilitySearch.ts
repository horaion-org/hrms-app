import { z } from "zod";
import type { AvailabilityListQuery } from "@/features/availability/api";
import { isMonday } from "@/features/availability/availabilityModel";
import { mondayOf } from "@/features/scheduling/schedules";

/** The page's two tabs: the caller's own availability, and their teams'. */
export type AvailabilityView = "mine" | "team";

const searchSchema = z.object({
	view: z.enum(["mine", "team"]).optional().catch(undefined),
	branch: z.string().min(1).optional().catch(undefined),
	department: z.string().min(1).optional().catch(undefined),
	week: z.iso.date().refine(isMonday).optional().catch(undefined),
});

/**
 * The Availability page's state that belongs in the URL, so it survives a
 * reload and can be shared: the tab, the Branch and Department of the team
 * view, and the week, as its Monday. Each part is left out at its default:
 * the person's first tab, the first Branch, every Department, this week.
 */
export type AvailabilitySearch = z.infer<typeof searchSchema>;

/** Reads the URL's page state, dropping anything it does not recognise, a week not starting on a Monday among it. */
export const parseAvailabilitySearch = (
	search: Record<string, unknown>
): AvailabilitySearch => {
	const { view, branch, department, week } = searchSchema.parse(search);
	return {
		...(view === undefined ? {} : { view }),
		...(branch === undefined ? {} : { branch }),
		...(department === undefined ? {} : { department }),
		...(week === undefined ? {} : { week }),
	};
};

/**
 * The week shown: the URL's, else the one `today` is in. Worked out on
 * every render rather than kept, so a page left open across a Monday moves
 * on to the new week.
 */
export const weekOf = (search: AvailabilitySearch, today: Date): string =>
	search.week ?? mondayOf(today);

/** The URL's `week`, left out for the week `today` is in. */
export const weekParameter = (
	weekStartMonday: string,
	today: Date
): string | undefined =>
	weekStartMonday === mondayOf(today) ? undefined : weekStartMonday;

/** The tabs a person has, in order: Mine for a part-timer, Team with the read key held somewhere. */
export const viewsOf = ({
	mine,
	team,
}: {
	mine: boolean;
	team: boolean;
}): Array<AvailabilityView> => [
	...(mine ? (["mine"] as const) : []),
	...(team ? (["team"] as const) : []),
];

/** The tab shown: the URL's when the person has it, else their first; none when they have neither. */
export const viewOf = (
	requested: AvailabilityView | undefined,
	views: ReadonlyArray<AvailabilityView>
): AvailabilityView | undefined =>
	requested && views.includes(requested) ? requested : views[0];

/** The list the team tab asks the API for: the week's part-timers inside one Branch, and the URL's Department. */
export const availabilityQueryOf = (
	search: AvailabilitySearch,
	branchId: string,
	weekStartMonday: string
): AvailabilityListQuery => ({
	weekStartMonday,
	branchId,
	...(search.department ? { departmentId: search.department } : {}),
});
