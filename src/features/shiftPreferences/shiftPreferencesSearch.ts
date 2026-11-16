import { z } from "zod";
import { mondayOf } from "@/common/weeks";
import {
	unitSearchOf,
	unitSearchSchema,
} from "@/features/workspace/unitSearch";
import type { UnitSelectionRules } from "@/features/workspace/unitSelection";

/** The page's two tabs, in order: the caller's own preferences, and their teams'. */
const SHIFT_PREFERENCE_VIEWS = ["mine", "team"] as const;

/** One tab of the Shift preferences page. */
export type ShiftPreferenceView = (typeof SHIFT_PREFERENCE_VIEWS)[number];

/** Whether "YYYY-MM-DD" is a Monday, the only day a week may start on. */
const isMonday = (date: string): boolean => mondayOf(date) === date;

const searchSchema = z.object({
	view: z.enum(SHIFT_PREFERENCE_VIEWS).optional().catch(undefined),
	...unitSearchSchema.shape,
	week: z.iso.date().refine(isMonday).optional().catch(undefined),
	/** The one day a week grid shows below `md`; today, else the week's first day, when left out (`shownDayOf`). */
	day: z.iso.date().optional().catch(undefined),
});

/**
 * The Shift preferences page's state that belongs in the URL, so it
 * survives a reload and can be shared: the tab, the Branch and Department
 * of the team view, the week, as its Monday, and the one day a phone shows
 * of it. Each part is left out at its default: the person's first tab, the
 * default Branch (see `resolveUnitSelection`), every Department, this week,
 * today.
 */
export type ShiftPreferencesSearch = z.infer<typeof searchSchema>;

/** Reads the URL's page state, dropping anything it does not recognise, a week not starting on a Monday among it. */
export const parseShiftPreferencesSearch = (
	search: Record<string, unknown>
): ShiftPreferencesSearch => {
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
export const weekOf = (search: ShiftPreferencesSearch, today: Date): string =>
	search.week ?? mondayOf(today);

/** The URL's `week`, left out for the week `today` is in. */
export const weekParameter = (
	weekStartMonday: string,
	today: Date
): string | undefined =>
	weekStartMonday === mondayOf(today) ? undefined : weekStartMonday;

/** Whether the week starting `monday` has ended: it starts before the week `today` is in. */
export const isPastWeek = (monday: string, today: Date): boolean =>
	monday < mondayOf(today);

/** The tabs a person has, in order: their own for everyone, Team with the read key held somewhere. */
export const viewsOf = (team: boolean): Array<ShiftPreferenceView> => [
	"mine",
	...(team ? (["team"] as const) : []),
];

/** The tab shown: the URL's when the person has it, else their own. */
export const viewOf = (
	requested: ShiftPreferenceView | undefined,
	views: ReadonlyArray<ShiftPreferenceView>
): ShiftPreferenceView =>
	requested && views.includes(requested) ? requested : "mine";

/** The team tab lists members by Branch, and by Department within it. */
export const SHIFT_PREFERENCES_TEAM_UNIT_RULES: UnitSelectionRules = {
	withDepartment: true,
};

/** The unit rules of a view: the team tab lists by Branch; the person's own week does not. */
export const shiftPreferencesUnitRulesOf = (
	view: ShiftPreferencesSearch["view"]
): UnitSelectionRules | undefined =>
	view === "team" ? SHIFT_PREFERENCES_TEAM_UNIT_RULES : undefined;
