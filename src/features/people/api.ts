import {
	keepPreviousData,
	queryOptions,
	skipToken,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import {
	companyPath,
	fetchList,
	type ListPage,
} from "@/features/organisation/api";
import { retry } from "@/features/workspace/retry";

const memberStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

/** Whether a person's membership of the company is active. */
export type MemberStatus = z.infer<typeof memberStatusSchema>;

export const MEMBER_STATUSES = memberStatusSchema.options;

export const isMemberStatus = (value: string): value is MemberStatus =>
	memberStatusSchema.safeParse(value).success;

const memberProfileSchema = z.object({
	membershipId: z.string(),
	employeeCode: z.string(),
	displayName: z.string(),
	email: z.string(),
	/** E.164, e.g. `+6591234821`. */
	phone: z.string().nullable(),
	departmentId: z.string().nullable(),
	departmentName: z.string().nullable(),
	jobTitleId: z.string().nullable(),
	jobTitleName: z.string().nullable(),
	status: memberStatusSchema,
});

/** One person in the company as the People list shows them. */
export type MemberProfile = z.infer<typeof memberProfileSchema>;

/** The fields the API sorts people by. */
export const PEOPLE_SORT_FIELDS = [
	"displayName",
	"employeeCode",
	"department",
	"jobTitle",
	"status",
	"createdAt",
] as const;

export type PeopleSortField = (typeof PEOPLE_SORT_FIELDS)[number];

export const isPeopleSortField = (value: string): value is PeopleSortField =>
	(PEOPLE_SORT_FIELDS as ReadonlyArray<string>).includes(value);

export type PeopleSort = { field: PeopleSortField; desc: boolean };

export const PEOPLE_PAGE_SIZE = 10;

/** The longest search the API accepts. */
export const PEOPLE_SEARCH_MAX_LENGTH = 100;

/** One page of people: `page` counts from 1, as people do. */
export type PeopleQuery = {
	page: number;
	sort: PeopleSort;
	status?: MemberStatus;
	/** Matches name and employee ID on the server; blank lists everyone. */
	search: string;
};

export const peoplePath = (
	companyId: string,
	{ page, sort, status, search }: PeopleQuery
): string => {
	const query = new URLSearchParams({
		// The API counts pages from 0.
		page: String(page - 1),
		size: String(PEOPLE_PAGE_SIZE),
		sort: `${sort.field},${sort.desc ? "desc" : "asc"}`,
	});
	if (status) query.set("status", status);
	const text = search.trim().slice(0, PEOPLE_SEARCH_MAX_LENGTH);
	if (text) query.set("search", text);
	return `${companyPath(companyId)}/member-profiles?${query.toString()}`;
};

export const fetchPeople = (
	companyId: string,
	query: PeopleQuery
): Promise<ListPage<MemberProfile>> =>
	fetchList(peoplePath(companyId, query), memberProfileSchema);

/**
 * One page of the company's people; each page, sort, status and search is
 * its own entry. `allowed` false asks for nothing, for a person the
 * workspace does not grant the list.
 */
export const peopleQuery = (
	companyId: string,
	query: PeopleQuery,
	allowed = true
): UndefinedInitialDataOptions<
	ListPage<MemberProfile>,
	Error,
	ListPage<MemberProfile>,
	readonly ["people", string, PeopleQuery]
> =>
	queryOptions({
		queryKey: ["people", companyId, query] as const,
		queryFn: allowed
			? (): Promise<ListPage<MemberProfile>> => fetchPeople(companyId, query)
			: skipToken,
		// Keep the current rows on screen while another page, sort or filter loads.
		placeholderData: keepPreviousData,
		// The route loader's fetch serves the first render instead of being repeated on mount.
		staleTime: 30_000,
		retry,
	});
