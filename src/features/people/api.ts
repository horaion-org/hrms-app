import {
	infiniteQueryOptions,
	queryOptions,
	skipToken,
	type InfiniteData,
	type UnusedSkipTokenInfiniteOptions,
	type UnusedSkipTokenOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, apiRequestVoid, fetchList } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import type { QueryOptionsFor } from "@/common/query-client";
import type { ListPage } from "@/common/schemas";
import {
	accessiblePreviousData,
	administrativeMeta,
	selfMeta,
} from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/** Every people query's key, shaped like `approvalKeys`. */
export const peopleKeys = {
	all: (companyId: string) => ["people", companyId] as const,
	list: (companyId: string, query: PeopleQuery) =>
		[...peopleKeys.all(companyId), query] as const,
	me: (companyId: string) => [...peopleKeys.all(companyId), "me"] as const,
	profile: (companyId: string, membershipId: string) =>
		[...peopleKeys.all(companyId), "profile", membershipId] as const,
	notes: (companyId: string, membershipId: string) =>
		[...peopleKeys.profile(companyId, membershipId), "notes"] as const,
	/** One member's skills, on their profile. */
	memberSkills: (companyId: string, membershipId: string) =>
		[...peopleKeys.profile(companyId, membershipId), "skills"] as const,
	/** The catalogue's active skills matching what is typed in a profile. */
	skillSuggestions: (companyId: string, search: string) =>
		[...peopleKeys.all(companyId), "skills", search] as const,
	activeMemberCount: (companyId: string) =>
		[...peopleKeys.all(companyId), "active-member-count"] as const,
	imports: (companyId: string) =>
		[...peopleKeys.all(companyId), "imports"] as const,
	import: (companyId: string, importId: string) =>
		[...peopleKeys.imports(companyId), importId] as const,
};

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
	/** The Branch of the person's Department; null with no Department. */
	branchId: z.string().nullable(),
	branchName: z.string().nullable(),
	departmentId: z.string().nullable(),
	departmentName: z.string().nullable(),
	jobTitleId: z.string().nullable(),
	jobTitleName: z.string().nullable(),
	status: memberStatusSchema,
	/** True until the person first signs in; null from an API that does not say. */
	invitationPending: z.boolean().nullable().catch(null),
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
	/** The Branch of the member's home Department; left out lists every Branch in reach. */
	branchId?: string;
	/** The member's home Department; left out lists every Department in reach. */
	departmentId?: string;
	/** The employment terms people hold today; left out lists everyone. */
	employmentTermsId?: string;
	/** True lists people who have not signed in yet, false those who have; left out lists everyone. */
	invitationPending?: boolean;
};

export const peoplePath = (
	companyId: string,
	{
		page,
		sort,
		status,
		search,
		branchId,
		departmentId,
		employmentTermsId,
		invitationPending,
	}: PeopleQuery
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
	if (branchId) query.set("branchId", branchId);
	if (departmentId) query.set("departmentId", departmentId);
	if (employmentTermsId) query.set("employmentTermsId", employmentTermsId);
	if (invitationPending !== undefined)
		query.set("invitationPending", String(invitationPending));
	return `${companyPath(companyId)}/member-profiles?${query.toString()}`;
};

export const fetchPeople = (
	companyId: string,
	query: PeopleQuery,
	signal?: AbortSignal
): Promise<ListPage<MemberProfile>> =>
	fetchList(peoplePath(companyId, query), memberProfileSchema, signal);

/** How many active people the person can see; one row is enough, only the total is read. */
export const fetchActiveMemberCount = async (
	companyId: string
): Promise<number> =>
	(
		await fetchList(
			`${companyPath(companyId)}/member-profiles?status=ACTIVE&size=1`,
			memberProfileSchema
		)
	).total;

/**
 * One page of the company's people; each page, sort, status and search is
 * its own entry. `allowed` false asks for nothing, for a person the
 * workspace does not grant the list.
 */
export const peopleQuery = (
	companyId: string,
	query: PeopleQuery,
	allowed = true
): QueryOptionsFor<
	ListPage<MemberProfile>,
	ReturnType<typeof peopleKeys.list>
> =>
	queryOptions({
		queryKey: peopleKeys.list(companyId, query),
		queryFn: allowed
			? ({ signal }): Promise<ListPage<MemberProfile>> =>
					fetchPeople(companyId, query, signal)
			: skipToken,
		// Keep the current rows on screen while another page, sort or filter loads, unless withdrawn.
		placeholderData: accessiblePreviousData(),
		meta: administrativeMeta(companyId),
		// The route loader's fetch serves the first render instead of being repeated on mount.
		staleTime: 30_000,
		retry,
	});

const employmentTypeSchema = z.enum([
	"FULL_TIME",
	"PART_TIME",
	"CONTRACT",
	"INTERN",
]);

/** How a person is employed. */
export type EmploymentType = z.infer<typeof employmentTypeSchema>;

export const EMPLOYMENT_TYPES = employmentTypeSchema.options;

export const isEmploymentType = (value: string): value is EmploymentType =>
	employmentTypeSchema.safeParse(value).success;

/**
 * A new person, as the API takes them. When selected, their Department (and its Branch) is
 * in the URL; otherwise they join the company without unit placement. Optional fields are left out rather than sent
 * empty; dates are ISO `YYYY-MM-DD` and the phone is E.164.
 */
export type CreateMemberProfileBody = {
	displayName: string;
	email: string;
	jobTitleId?: string;
	/** The person's manager, as the API calls it. */
	reportsToMembershipId?: string;
	dateOfBirth?: string;
	phone?: string;
	employmentType?: EmploymentType;
	hireDate?: string;
	probationEndDate?: string;
};

/**
 * A Department of a Branch: where a new person joins, and where a system
 * role is granted. Changes to an existing person never name it in their URL.
 */
export type MemberProfilePlace = { branchId: string; departmentId: string };

/**
 * Adds a person to one Department, or to the company without a Department, and invites them by email; the identity
 * provider sends their temporary password. Returns them as the list shows them.
 */
export const createMemberProfile = (
	companyId: string,
	place: MemberProfilePlace | undefined,
	body: CreateMemberProfileBody
): Promise<MemberProfile> => {
	if (!place)
		return apiRequest(
			`${companyPath(companyId)}/member-profiles`,
			memberProfileSchema,
			{ method: "POST", body, responseFormat: "record" }
		);
	return apiRequest(
		`${companyPath(companyId)}/branches/${encodeURIComponent(place.branchId)}/departments/${encodeURIComponent(place.departmentId)}/member-profiles`,
		memberProfileSchema,
		{ method: "POST", body }
	);
};

/** ISO `YYYY-MM-DD`, or null when not set. */
const isoDateSchema = z.string().nullable();

const memberProfileDetailSchema = memberProfileSchema.extend({
	dateOfBirth: isoDateSchema,
	employmentType: employmentTypeSchema.nullable(),
	hireDate: isoDateSchema,
	probationEndDate: isoDateSchema,
	endDate: isoDateSchema,
	/** The person's manager, as the API calls it. */
	reportsTo: z
		.object({ membershipId: z.string(), displayName: z.string() })
		.nullable(),
	/** True until the person first logs in; null when the API can't tell. */
	invitationPending: z.boolean().nullable(),
});

/** One person's whole profile, as their page shows it. */
export type MemberProfileDetail = z.infer<typeof memberProfileDetailSchema>;

/**
 * A person's address, for reading and for every change. The API finds their
 * Department itself and checks each key there, or at the company for
 * someone without one.
 */
const memberProfilePath = (companyId: string, membershipId: string): string =>
	`${companyPath(companyId)}/member-profiles/${encodeURIComponent(membershipId)}`;

/**
 * One person. The API answers 404 for nobody and 403 for someone outside
 * the units where the person may read profiles; the page treats both alike.
 */
export const fetchMemberProfile = (
	companyId: string,
	membershipId: string,
	signal?: AbortSignal
): Promise<MemberProfileDetail> =>
	apiRequest(
		memberProfilePath(companyId, membershipId),
		memberProfileDetailSchema,
		{ signal }
	);

/** One person's profile; inside the People entries, so changes to people reload it. */
/** The caller's own profile in the company: no member id, the API resolves it from the membership. */
export const fetchMyProfile = (
	companyId: string,
	signal?: AbortSignal
): Promise<MemberProfileDetail> =>
	apiRequest(
		`${companyPath(companyId)}/me/profile`,
		memberProfileDetailSchema,
		{ signal }
	);

export const myProfileQuery = (
	companyId: string
): UnusedSkipTokenOptions<
	MemberProfileDetail,
	Error,
	MemberProfileDetail,
	ReturnType<typeof peopleKeys.me>
> =>
	queryOptions({
		queryKey: peopleKeys.me(companyId),
		queryFn: ({ signal }) => fetchMyProfile(companyId, signal),
		// Own record: never gated by, or withdrawn for, administrative grants.
		meta: selfMeta(companyId),
		staleTime: 30_000,
		retry,
	});

export const memberProfileQuery = (
	companyId: string,
	membershipId: string
): UnusedSkipTokenOptions<
	MemberProfileDetail,
	Error,
	MemberProfileDetail,
	ReturnType<typeof peopleKeys.profile>
> =>
	queryOptions({
		queryKey: peopleKeys.profile(companyId, membershipId),
		queryFn: ({ signal }) =>
			fetchMemberProfile(companyId, membershipId, signal),
		// A 404 here may mean the person moved out of reach: see `refreshWorkspaceOnRefusal`.
		meta: administrativeMeta(companyId, { record: true }),
		// The route loader's fetch serves the first render instead of being repeated on mount.
		staleTime: 30_000,
		retry,
	});

/**
 * A saved profile to show until it is read again. A save's answer has
 * `invitationPending` null unless the email was changed, which says nothing
 * about the invitation, so what was known before is kept.
 */
export const savedProfile = (
	saved: MemberProfileDetail,
	previous: MemberProfileDetail | undefined
): MemberProfileDetail => ({
	...saved,
	invitationPending:
		saved.invitationPending ?? previous?.invitationPending ?? null,
});

/**
 * A person's profile as an update sends it. `PUT` replaces the profile, so
 * every field is sent and an empty one is null, never "". The employee ID
 * never changes, and a person may have no Department.
 */
export type UpdateMemberProfileBody = {
	displayName: string;
	email: string;
	status: MemberStatus;
	/** A different one from their current Department moves them there. */
	departmentId: string | null;
	jobTitleId: string | null;
	reportsToMembershipId: string | null;
	dateOfBirth: string | null;
	phone: string | null;
	employmentType: EmploymentType | null;
	hireDate: string | null;
	probationEndDate: string | null;
};

/** Saves a person's profile and returns it as saved. */
export const updateMemberProfile = (
	companyId: string,
	membershipId: string,
	body: UpdateMemberProfileBody
): Promise<MemberProfileDetail> =>
	apiRequest(
		memberProfilePath(companyId, membershipId),
		memberProfileDetailSchema,
		{ method: "PUT", body }
	);

/** Emails the person a new invitation to log in; only while they have never logged in. */
export const resendInvitation = (
	companyId: string,
	membershipId: string
): Promise<void> =>
	apiRequestVoid(`${memberProfilePath(companyId, membershipId)}/invitation`, {
		method: "POST",
	});

const memberNoteSchema = z.object({
	noteId: z.string(),
	/** As written, line breaks kept. */
	body: z.string(),
	/** The name is null when the API can't show who wrote it. */
	author: z.object({
		membershipId: z.string(),
		displayName: z.string().nullable(),
	}),
	createdAt: z.string(),
	updatedAt: z.string(),
	edited: z.boolean(),
});

/** One note about a person. */
export type MemberNote = z.infer<typeof memberNoteSchema>;

/** How many notes one page brings: the API's own default. */
export const NOTES_PAGE_SIZE = 20;

/** The longest note the API keeps, after trimming. */
export const NOTE_MAX_LENGTH = 1000;

/** One page of a person's notes, newest first; `page` counts from 0, as the API does. */
export const fetchMemberNotes = (
	companyId: string,
	membershipId: string,
	page: number,
	signal?: AbortSignal
): Promise<ListPage<MemberNote>> =>
	fetchList(
		`${memberProfilePath(companyId, membershipId)}/notes?${new URLSearchParams({
			page: String(page),
			size: String(NOTES_PAGE_SIZE),
		}).toString()}`,
		memberNoteSchema,
		signal
	);

/**
 * A person's notes, a page at a time as more are asked for. The API returns
 * only the notes the person may read.
 */
export const memberNotesQuery = (
	companyId: string,
	membershipId: string
): UnusedSkipTokenInfiniteOptions<
	ListPage<MemberNote>,
	Error,
	InfiniteData<ListPage<MemberNote>>,
	ReturnType<typeof peopleKeys.notes>,
	number
> =>
	infiniteQueryOptions({
		queryKey: peopleKeys.notes(companyId, membershipId),
		queryFn: ({ pageParam, signal }) =>
			fetchMemberNotes(companyId, membershipId, pageParam, signal),
		meta: administrativeMeta(companyId),
		initialPageParam: 0,
		getNextPageParam: (last, pages) =>
			pages.reduce((count, page) => count + page.items.length, 0) <
				last.total && last.items.length > 0
				? pages.length
				: undefined,
		retry,
	});

/** Adds a note about a person. */
export const createMemberNote = (
	companyId: string,
	membershipId: string,
	body: string
): Promise<MemberNote> =>
	apiRequest(
		`${memberProfilePath(companyId, membershipId)}/notes`,
		memberNoteSchema,
		{ method: "POST", body: { body } }
	);

/** Rewrites a note. */
export const updateMemberNote = (
	companyId: string,
	membershipId: string,
	noteId: string,
	body: string
): Promise<MemberNote> =>
	apiRequest(
		`${memberProfilePath(companyId, membershipId)}/notes/${encodeURIComponent(noteId)}`,
		memberNoteSchema,
		{ method: "PUT", body: { body } }
	);

/** Deletes a note. */
export const deleteMemberNote = (
	companyId: string,
	membershipId: string,
	noteId: string
): Promise<void> =>
	apiRequestVoid(
		`${memberProfilePath(companyId, membershipId)}/notes/${encodeURIComponent(noteId)}`,
		{ method: "DELETE" }
	);

const memberSkillSchema = z.object({
	skillId: z.string(),
	name: z.string(),
	category: z.string().nullable(),
	/** How the skill is measured: rated 1 to 10, or simply held. */
	proficiencyScale: z.enum(["ONE_TO_TEN", "NONE", "UNKNOWN"]).catch("UNKNOWN"),
	/** Whether the skill asks holders for the last day their credential is valid. */
	tracksExpiry: z.boolean(),
	/** How long a new credential usually lasts; prefills an expiry date. */
	validityMonths: z.number().int().nullable(),
	/** The skill's own status; an inactive skill stays with those who hold it. */
	skillStatus: z.enum(["ACTIVE", "INACTIVE", "UNKNOWN"]).catch("UNKNOWN"),
	/** 1 to 10 for a rated skill; null for one that is simply held. */
	proficiency: z.number().int().nullable(),
	notes: z.string().nullable(),
	issuedOn: z.string().nullable(),
	/** The last day the credential is valid. */
	expiresOn: z.string().nullable(),
});

/** One of a person's skills: how well they do it, notes, and a credential's dates. */
export type MemberSkill = z.infer<typeof memberSkillSchema>;

/**
 * One holding as replacing a person's skills sends it. The name finds the
 * catalogue's skill; the API refuses an unknown one. A rating is sent only
 * for a skill rated 1 to 10, and dates only for one that tracks expiry.
 */
export type SkillValue = {
	name: string;
	proficiency: number | null;
	notes: string | null;
	issuedOn: string | null;
	expiresOn: string | null;
};

/** A person's skills, ordered by name; not paged. */
export const fetchMemberSkills = (
	companyId: string,
	membershipId: string,
	signal?: AbortSignal
): Promise<Array<MemberSkill>> =>
	apiRequest(
		`${memberProfilePath(companyId, membershipId)}/skills`,
		z.array(memberSkillSchema),
		{ signal }
	);

/** A person's skills; inside their profile's entries, so a saved profile reloads them. */
export const memberSkillsQuery = (
	companyId: string,
	membershipId: string
): UnusedSkipTokenOptions<
	Array<MemberSkill>,
	Error,
	Array<MemberSkill>,
	ReturnType<typeof peopleKeys.memberSkills>
> =>
	queryOptions({
		queryKey: peopleKeys.memberSkills(companyId, membershipId),
		queryFn: ({ signal }) => fetchMemberSkills(companyId, membershipId, signal),
		meta: administrativeMeta(companyId),
		retry,
	});

/** Replaces a person's skills with `skills`, the complete new set, and returns them as saved. */
export const replaceMemberSkills = (
	companyId: string,
	membershipId: string,
	skills: ReadonlyArray<SkillValue>
): Promise<Array<MemberSkill>> =>
	apiRequest(
		`${memberProfilePath(companyId, membershipId)}/skills`,
		z.array(memberSkillSchema),
		{ method: "PUT", body: { skills } }
	);
