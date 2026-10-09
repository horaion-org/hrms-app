import { z } from "zod";
import {
	MEMBER_STATUSES,
	PEOPLE_SORT_FIELDS,
	type MemberStatus,
	type PeopleQuery,
	type PeopleSort,
} from "@/features/people/api";

const sortParameterSchema = z.templateLiteral([
	z.enum(PEOPLE_SORT_FIELDS),
	",",
	z.enum(["asc", "desc"]),
]);

/** A sort as the URL carries it, e.g. `jobTitle,desc`, the API's own form. */
export type PeopleSortParameter = z.infer<typeof sortParameterSchema>;

/** People are listed by name, A to Z, unless the URL says otherwise. */
const DEFAULT_SORT_PARAMETER: PeopleSortParameter = "displayName,asc";

const searchSchema = z.object({
	page: z.number().int().min(1).optional().catch(undefined),
	sort: sortParameterSchema.optional().catch(undefined),
	status: z.enum(MEMBER_STATUSES).optional().catch(undefined),
	branch: z.string().min(1).optional().catch(undefined),
});

/**
 * The People table's state that belongs in the URL, so it survives a reload
 * and can be shared. Each part is left out at its default: the first page,
 * sorted by name, every status, every Branch. The search text is never here: names
 * typed into it must not land in browser history or logs.
 */
export type PeopleSearch = z.infer<typeof searchSchema>;

/** Reads the URL's table state, dropping anything it does not recognise. */
export const parsePeopleSearch = (
	search: Record<string, unknown>
): PeopleSearch => {
	const { page, sort, status, branch } = searchSchema.parse(search);
	return {
		...(page === undefined || page === 1 ? {} : { page }),
		...(sort === undefined || sort === DEFAULT_SORT_PARAMETER ? {} : { sort }),
		...(status === undefined ? {} : { status }),
		...(branch === undefined ? {} : { branch }),
	};
};

export const sortOf = ({
	sort = DEFAULT_SORT_PARAMETER,
}: PeopleSearch): PeopleSort => {
	const [field, direction] = sort.split(",") as [PeopleSort["field"], string];
	return { field, desc: direction === "desc" };
};

/** The URL's `sort` for a sort, left out for the default. */
export const sortParameter = ({
	field,
	desc,
}: PeopleSort): PeopleSortParameter | undefined => {
	const parameter: PeopleSortParameter = `${field},${desc ? "desc" : "asc"}`;
	return parameter === DEFAULT_SORT_PARAMETER ? undefined : parameter;
};

/** The URL's `page`, left out for the first. */
export const pageParameter = (page: number): number | undefined =>
	page > 1 ? page : undefined;

/** The statuses ticked in the "Showing" filter: both when the URL names none. */
export const statusesOf = ({ status }: PeopleSearch): Array<MemberStatus> =>
	status ? [status] : [...MEMBER_STATUSES];

/** The URL's `status` for the ticked statuses: both or neither mean no filter. */
export const statusParameter = (
	statuses: ReadonlyArray<MemberStatus>
): MemberStatus | undefined =>
	statuses.length === 1 ? statuses[0] : undefined;

/** The page of people to ask the API for, inside the Branch shown, if any. */
export const peopleQueryOf = (
	search: PeopleSearch,
	text: string,
	branchId?: string
): PeopleQuery => ({
	page: search.page ?? 1,
	sort: sortOf(search),
	...(search.status ? { status: search.status } : {}),
	search: text.trim(),
	...(branchId ? { branchId } : {}),
});

/**
 * A person's page in the URL: `edit` opens it ready to change, so an edit can
 * be linked to from the People list and survives a reload.
 */
export type ProfileSearch = { edit?: true };

/** Reads a person's page's URL state, dropping anything it does not recognise. */
export const parseProfileSearch = (
	search: Record<string, unknown>
): ProfileSearch => (search["edit"] === true ? { edit: true } : {});
