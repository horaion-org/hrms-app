import { z } from "zod";
import {
	CONSTRAINT_READ_KEYS,
	SCHEDULE_READ_KEYS,
	SHIFT_READ_KEYS,
	type PermissionKey,
} from "@/features/workspace/permissionKeys";
import {
	unitSearchOf,
	unitSearchSchema,
} from "@/features/workspace/unitSearch";

/** Scheduling's tabs, in the order they show. */
export const SCHEDULING_VIEWS = ["schedules", "shifts", "constraints"] as const;

export type SchedulingView = (typeof SCHEDULING_VIEWS)[number];

/** The read keys that offer each tab; its Branch and Department choices follow them too. */
export const SCHEDULING_VIEW_KEYS: Record<
	SchedulingView,
	ReadonlyArray<PermissionKey>
> = {
	schedules: SCHEDULE_READ_KEYS,
	shifts: SHIFT_READ_KEYS,
	constraints: CONSTRAINT_READ_KEYS,
};

/** Every key that offers a tab: the navigation offers Scheduling with any of them. */
export const SCHEDULING_KEYS: ReadonlyArray<PermissionKey> =
	SCHEDULING_VIEWS.flatMap((view) => SCHEDULING_VIEW_KEYS[view]);

const searchSchema = z.object({
	view: z.enum(SCHEDULING_VIEWS).optional().catch(undefined),
	...unitSearchSchema.shape,
});

/**
 * The Scheduling page's state that belongs in the URL, so it survives a
 * reload and can be shared: the tab, and the Branch and Department its list
 * is narrowed to. Each part is left out at its default: Schedules, the
 * default Branch (see `resolveUnitSelection`), every Department.
 */
export type SchedulingSearch = z.infer<typeof searchSchema>;

/** Reads the URL's page state, dropping anything it does not recognise. */
export const parseSchedulingSearch = (
	search: Record<string, unknown>
): SchedulingSearch => {
	const { view, branch, department } = searchSchema.parse(search);
	return {
		...(view === undefined || view === "schedules" ? {} : { view }),
		...unitSearchOf({ branch, department }),
	};
};

/** The tabs a person has, in order: each one whose read keys they hold somewhere. */
export const schedulingViewsOf = (
	canRead: (keys: ReadonlyArray<PermissionKey>) => boolean
): Array<SchedulingView> =>
	SCHEDULING_VIEWS.filter((view) => canRead(SCHEDULING_VIEW_KEYS[view]));

/** The tab shown: the URL's when the person has it, else their first; none when they have none. */
export const schedulingViewOf = (
	requested: SchedulingView | undefined,
	views: ReadonlyArray<SchedulingView>
): SchedulingView | undefined =>
	requested && views.includes(requested) ? requested : views[0];
