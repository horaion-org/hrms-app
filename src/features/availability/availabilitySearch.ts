import { z } from "zod";
import { mondayOf } from "@/common/weeks";
import type { AvailabilityListQuery } from "@/features/availability/api";
import { isMonday } from "@/features/availability/availabilityModel";
import {
	unitSearchOf,
	unitSearchSchema,
} from "@/features/workspace/unitSearch";
import type {
	UnitSelection,
	UnitSelectionRules,
} from "@/features/workspace/unitSelection";

/** The page's two tabs: the caller's own availability, and their teams'. */
export type AvailabilityView = "mine" | "team";

const searchSchema = z.object({
	view: z.enum(["mine", "team"]).optional().catch(undefined),
	...unitSearchSchema.shape,
	week: z.iso.date().refine(isMonday).optional().catch(undefined),
	/** The one day the team grid shows below `md`; today, else the week's first day, when left out (`shownDayOf`). */
	day: z.iso.date().optional().catch(undefined),
});

/**
 * The Availability page's state that belongs in the URL, so it survives a
 * reload and can be shared: the tab, the Branch and Department of the team
 * view, the week, as its Monday, and the one day a phone shows of it. Each
 * part is left out at its default: the person's first tab, the default
 * Branch (see `resolveUnitSelection`), every Department, this week, today.
 */
export type AvailabilitySearch = z.infer<typeof searchSchema>;

/** Reads the URL's page state, dropping anything it does not recognise, a week not starting on a Monday among it. */
export const parseAvailabilitySearch = (
	search: Record<string, unknown>
): AvailabilitySearch => {
	const { view, branch, department, week, day } = searchSchema.parse(search);
	return {
		...(view === undefined ? {} : { view }),
		...unitSearchOf({ branch, department }),
		...(week === undefined ? {} : { week }),
		...(day === undefined ? {} : { day }),
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

/** The team tab lists part-timers by Branch, and by Department within it. */
export const AVAILABILITY_TEAM_UNIT_RULES: UnitSelectionRules = {
	withDepartment: true,
};

/** The unit rules of a view: the team tab lists by Branch; the person's own week does not. */
export const availabilityUnitRulesOf = (
	view: AvailabilitySearch["view"]
): UnitSelectionRules | undefined =>
	view === "team" ? AVAILABILITY_TEAM_UNIT_RULES : undefined;

/** The list the team tab asks the API for: the week's part-timers in the Branch and Department shown, if one is. */
export const availabilityQueryOf = (
	{ branchId, departmentId }: UnitSelection,
	weekStartMonday: string
): AvailabilityListQuery => ({
	weekStartMonday,
	...(branchId ? { branchId } : {}),
	...(departmentId ? { departmentId } : {}),
});
