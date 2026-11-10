import { z } from "zod";
import { apiRequest, apiRequestVoid, fetchList } from "@/common/api-client";
import type { ListPage } from "@/common/schemas";
import type { IsoDate } from "@/components/forms/Calendar";
import { companyPath, LIST_PAGE_SIZE } from "@/features/organisation/api";

/*
 * The company's skill catalogue (the API's ADR-0057). A skill is rated 1 to
 * 10 (ONE_TO_TEN) or simply held (NONE, as a licence is), and may track
 * expiry, asking each holder for the last day their credential is valid. The
 * catalogue is read and managed under the `skill` keys, company-wide; who
 * holds a skill, and how well, stays under `member_profile`.
 */

// A scale or status a newer API adds reads as UNKNOWN instead of failing the whole answer.
const proficiencyScaleSchema = z
	.enum(["ONE_TO_TEN", "NONE", "UNKNOWN"])
	.catch("UNKNOWN");
const skillStatusSchema = z
	.enum(["ACTIVE", "INACTIVE", "UNKNOWN"])
	.catch("UNKNOWN");

/** How a skill's holders are measured; UNKNOWN is a scale newer than this app. */
export type ProficiencyScale = z.infer<typeof proficiencyScaleSchema>;

/** The scales a skill can be given here. */
export const PROFICIENCY_SCALES = ["ONE_TO_TEN", "NONE"] as const;

export type ChosenProficiencyScale = (typeof PROFICIENCY_SCALES)[number];

/** A skill's lifecycle; an inactive skill keeps its holders and takes no new ones. */
export type SkillStatus = z.infer<typeof skillStatusSchema>;

/** The most characters a category takes. */
export const SKILL_CATEGORY_MAX_LENGTH = 64;
/** The most characters a description takes. */
export const SKILL_DESCRIPTION_MAX_LENGTH = 2000;
/** The longest validity a skill may suggest, in months. */
export const SKILL_VALIDITY_MAX_MONTHS = 120;
/** The most people one bulk assignment reaches. */
export const BULK_ASSIGN_MAX_PEOPLE = 500;

const skillSchema = z.object({
	skillId: z.string(),
	name: z.string(),
	category: z.string().nullable(),
	description: z.string().nullable(),
	proficiencyScale: proficiencyScaleSchema,
	tracksExpiry: z.boolean(),
	/** How long a new credential usually lasts; prefills an expiry date. */
	validityMonths: z.number().int().nullable(),
	status: skillStatusSchema,
	/** When it was created (an ISO instant). */
	createdAt: z.string().optional(),
});

/** One skill of the company's catalogue. */
export type Skill = z.infer<typeof skillSchema>;

const skillOverviewSchema = skillSchema.extend({
	/** How many people hold it, company-wide; names nobody. */
	holders: z.number().int(),
	/** How many of their credentials stop being valid within 30 days. */
	expiringSoon: z.number().int(),
	/** How many of their credentials are no longer valid. */
	expired: z.number().int(),
});

/** A skill as the catalogue page lists it, with its holder counts. */
export type SkillOverview = z.infer<typeof skillOverviewSchema>;

export type SkillOverviewQuery = {
	status?: "ACTIVE" | "INACTIVE";
	category?: string;
	/** The day expiry counts are read on, in the viewer's own calendar. */
	asOf: IsoDate;
};

/** The catalogue with holder counts, by name; one page of up to 100 rows. */
export const fetchSkillOverview = (
	companyId: string,
	{ status, category, asOf }: SkillOverviewQuery,
	signal?: AbortSignal
): Promise<ListPage<SkillOverview>> => {
	const query = new URLSearchParams({ size: String(LIST_PAGE_SIZE), asOf });
	if (status) query.set("status", status);
	if (category) query.set("category", category);
	return fetchList(
		`${companyPath(companyId)}/skill-overview?${query.toString()}`,
		skillOverviewSchema,
		signal
	);
};

/** Every category the company's skills use, sorted. */
export const fetchSkillCategories = (
	companyId: string,
	signal?: AbortSignal
): Promise<Array<string>> =>
	apiRequest(
		`${companyPath(companyId)}/skill-categories`,
		z.array(z.string()),
		{
			signal,
		}
	);

/** How many skills one picker search brings. */
export const SKILL_SUGGESTIONS_SIZE = 20;

/** The longest search the API accepts. */
const SKILL_SEARCH_MAX_LENGTH = 100;

/** Active catalogue skills containing `search`, ignoring case, by name: what may be given to someone. */
export const searchActiveSkills = (
	companyId: string,
	search: string,
	signal?: AbortSignal
): Promise<ListPage<Skill>> => {
	const query = new URLSearchParams({
		page: "0",
		size: String(SKILL_SUGGESTIONS_SIZE),
		status: "ACTIVE",
	});
	const text = search.trim().slice(0, SKILL_SEARCH_MAX_LENGTH);
	if (text) query.set("search", text);
	return fetchList(
		`${companyPath(companyId)}/skills?${query.toString()}`,
		skillSchema,
		signal
	);
};

/** What creating a skill sends; empty texts are sent as null. */
export type SkillBody = {
	name: string;
	category: string | null;
	description: string | null;
	proficiencyScale: ChosenProficiencyScale;
	tracksExpiry: boolean;
	/** Only with `tracksExpiry`. */
	validityMonths: number | null;
};

/** What updating a skill sends: its fields and the status to keep or set. */
export type UpdateSkillBody = SkillBody & { status: "ACTIVE" | "INACTIVE" };

const skillPath = (companyId: string, skillId: string): string =>
	`${companyPath(companyId)}/skills/${encodeURIComponent(skillId)}`;

/** Adds an active skill to the catalogue. */
export const createSkill = (
	companyId: string,
	body: SkillBody
): Promise<Skill> =>
	apiRequest(`${companyPath(companyId)}/skills`, skillSchema, {
		method: "POST",
		body,
	});

/** Replaces a skill's fields and status. Its scale and expiry tracking are fixed while anyone holds it. */
export const updateSkill = (
	companyId: string,
	skillId: string,
	body: UpdateSkillBody
): Promise<Skill> =>
	apiRequest(skillPath(companyId, skillId), skillSchema, {
		method: "PUT",
		body,
	});

/** Deletes a skill and takes it from everyone who holds it. */
export const deleteSkill = (
	companyId: string,
	skillId: string
): Promise<void> =>
	apiRequestVoid(skillPath(companyId, skillId), { method: "DELETE" });

const skillHolderSchema = z.object({
	membershipId: z.string(),
	proficiency: z.number().int().nullable(),
	issuedOn: z.string().nullable(),
	expiresOn: z.string().nullable(),
});

/** One person holding a skill, among those the caller may see. */
export type SkillHolder = z.infer<typeof skillHolderSchema>;

/** One page of a skill's holders inside the caller's scopes; `page` counts from 0. */
export const fetchSkillHolders = (
	companyId: string,
	skillId: string,
	{ departmentId, page }: { departmentId?: string; page: number },
	signal?: AbortSignal
): Promise<ListPage<SkillHolder>> => {
	const query = new URLSearchParams({
		page: String(page),
		size: String(LIST_PAGE_SIZE),
	});
	if (departmentId) query.set("departmentId", departmentId);
	return fetchList(
		`${skillPath(companyId, skillId)}/holders?${query.toString()}`,
		skillHolderSchema,
		signal
	);
};

const assignablePersonSchema = z.object({
	membershipId: z.string(),
	displayName: z.string(),
	departmentName: z.string().nullable(),
});

/** An active person a skill may be given to, as the bulk picker lists them. */
export type AssignablePerson = z.infer<typeof assignablePersonSchema>;

/** One page of active people by name, inside the caller's scopes; `page` counts from 0. */
export const fetchAssignablePeople = (
	companyId: string,
	{
		search,
		departmentId,
		page,
	}: { search: string; departmentId?: string; page: number },
	signal?: AbortSignal
): Promise<ListPage<AssignablePerson>> => {
	const query = new URLSearchParams({
		page: String(page),
		size: String(LIST_PAGE_SIZE),
		status: "ACTIVE",
		sort: "displayName,asc",
	});
	const text = search.trim().slice(0, SKILL_SEARCH_MAX_LENGTH);
	if (text) query.set("search", text);
	if (departmentId) query.set("departmentId", departmentId);
	return fetchList(
		`${companyPath(companyId)}/member-profiles?${query.toString()}`,
		assignablePersonSchema,
		signal
	);
};

/** What a bulk assignment gives everyone chosen. */
export type BulkAssignBody = {
	membershipIds: ReadonlyArray<string>;
	/** Only for a skill rated 1 to 10. */
	proficiency: number | null;
	notes: string | null;
	/** Only for a skill that tracks expiry. */
	issuedOn: IsoDate | null;
	expiresOn: IsoDate | null;
	/** Also changes the holding of people who already have the skill. */
	overwrite: boolean;
};

const bulkAssignResultSchema = z.object({
	/** People who did not hold it and now do. */
	assigned: z.number().int(),
	/** People who held it and had it changed (with `overwrite`). */
	updated: z.number().int(),
	/** People who held it and were left as they were. */
	skipped: z.number().int(),
	/** People who already hold the most skills allowed. */
	full: z.number().int(),
});

/** What a bulk assignment did. */
export type BulkAssignResult = z.infer<typeof bulkAssignResultSchema>;

/** Gives one skill to many people at once. */
export const assignSkill = (
	companyId: string,
	skillId: string,
	body: BulkAssignBody
): Promise<BulkAssignResult> =>
	apiRequest(
		`${skillPath(companyId, skillId)}/assignments`,
		bulkAssignResultSchema,
		{
			method: "POST",
			body,
		}
	);
