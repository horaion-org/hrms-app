import { z } from "zod";
import { isMonth } from "@/features/scheduling/months/monthSearch";
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
	/** Where the wizard waits while its department is set up: a new draft, or a saved one. */
	next: z.enum(["create", "draft"]).optional().catch(undefined),
	/** A new draft's week, its Monday as an ISO date. */
	week: z.iso.date().optional().catch(undefined),
	/** A new month's month, as "yyyy-MM". */
	month: z.string().refine(isMonth).optional().catch(undefined),
	/** The saved draft to return to. */
	scheduleId: z.string().min(1).optional().catch(undefined),
});

/**
 * The Scheduling page's state that belongs in the URL, so it survives a
 * reload and can be shared: the tab, and the Branch and Department its list
 * is narrowed to. Each part is left out at its default: Schedules, the
 * default Branch (see `resolveUnitSelection`), every Department. While the
 * wizard sends the person here to set a department up, `next` with `week`,
 * `month` or `scheduleId` says where to return; `next=draft` is kept only with its
 * `scheduleId`.
 */
export type SchedulingSearch = z.infer<typeof searchSchema>;

/** Reads the URL's page state, dropping anything it does not recognise. */
export const parseSchedulingSearch = (
	search: Record<string, unknown>
): SchedulingSearch => {
	const { view, branch, department, next, week, month, scheduleId } =
		searchSchema.parse(search);
	return {
		...(view === undefined || view === "schedules" ? {} : { view }),
		...unitSearchOf({ branch, department }),
		...(next === "create" || (next === "draft" && scheduleId) ? { next } : {}),
		...(week === undefined ? {} : { week }),
		...(month === undefined ? {} : { month }),
		...(scheduleId === undefined ? {} : { scheduleId }),
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
