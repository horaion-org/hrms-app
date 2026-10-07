import { z } from "zod";
import type { DateRange } from "@/components/forms/Calendar";
import {
	LEAVE_PAGE_SIZE,
	LEAVE_SORT_FIELDS,
	LEAVE_STATUSES,
	TIMELINE_PAGE_SIZE,
	type LeaveQuery,
	type LeaveSort,
} from "@/features/leave/api";

const sortParameterSchema = z.templateLiteral([
	z.enum(LEAVE_SORT_FIELDS),
	",",
	z.enum(["asc", "desc"]),
]);

/** A sort as the URL carries it, e.g. `startDate,asc`, the API's own form. */
export type LeaveSortParameter = z.infer<typeof sortParameterSchema>;

/** Requests are listed newest first unless the URL says otherwise. */
const DEFAULT_SORT_PARAMETER: LeaveSortParameter = "requestedAt,desc";

const searchSchema = z.object({
	view: z.enum(["requests", "timeline"]).optional().catch(undefined),
	branch: z.string().min(1).optional().catch(undefined),
	status: z.enum(LEAVE_STATUSES).optional().catch(undefined),
	page: z.number().int().min(1).optional().catch(undefined),
	sort: sortParameterSchema.optional().catch(undefined),
});

/**
 * The Leave page's state that belongs in the URL, so it survives a reload
 * and can be shared: the view (the caller's own leave unless `requests` or
 * `timeline` names a team view), the Branch, and the table's status, page
 * and sort. Each part is left out at its default: own leave, the first
 * Branch, every status, the first page, newest first.
 */
export type LeaveSearch = z.infer<typeof searchSchema>;

/** Reads the URL's page state, dropping anything it does not recognise. */
export const parseLeaveSearch = (
	search: Record<string, unknown>
): LeaveSearch => {
	const { view, branch, status, page, sort } = searchSchema.parse(search);
	return {
		...(view === undefined ? {} : { view }),
		...(branch === undefined ? {} : { branch }),
		...(status === undefined ? {} : { status }),
		...(page === undefined || page === 1 ? {} : { page }),
		...(sort === undefined || sort === DEFAULT_SORT_PARAMETER ? {} : { sort }),
	};
};

export const sortOf = ({
	sort = DEFAULT_SORT_PARAMETER,
}: LeaveSearch): LeaveSort => {
	const [field, direction] = sort.split(",") as [LeaveSort["field"], string];
	return { field, desc: direction === "desc" };
};

/** The URL's `sort` for a sort, left out for the default. */
export const sortParameter = ({
	field,
	desc,
}: LeaveSort): LeaveSortParameter | undefined => {
	const parameter: LeaveSortParameter = `${field},${desc ? "desc" : "asc"}`;
	return parameter === DEFAULT_SORT_PARAMETER ? undefined : parameter;
};

/** The URL's `page`, left out for the first. */
export const pageParameter = (page: number): number | undefined =>
	page > 1 ? page : undefined;

/** The page of requests the table asks the API for, inside one Branch. */
export const leaveQueryOf = (
	search: LeaveSearch,
	branchId: string
): LeaveQuery => ({
	page: search.page ?? 1,
	size: LEAVE_PAGE_SIZE,
	sort: sortOf(search),
	branchId,
	...(search.status ? { status: search.status } : {}),
});

/** The page of the caller's own requests the table asks the API for. */
export const myLeaveQueryOf = (search: LeaveSearch): LeaveQuery => ({
	page: search.page ?? 1,
	size: LEAVE_PAGE_SIZE,
	sort: sortOf(search),
	...(search.status ? { status: search.status } : {}),
});

/**
 * The requests the timeline draws: everything sharing a day with the window,
 * in one page, earliest first. Rejected requests are left out when drawn.
 */
export const timelineQueryOf = (
	branchId: string,
	range: DateRange
): LeaveQuery => ({
	page: 1,
	size: TIMELINE_PAGE_SIZE,
	sort: { field: "startDate", desc: false },
	branchId,
	from: range.start,
	to: range.end,
});
