import { normalizeBranchCity } from "@/features/organisation/city";
import { z } from "zod";
import { apiRequest, fetchList } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import { memberRefSchema, type ListPage } from "@/common/schemas";

/**
 * Every organisation query's key, shaped like `approvalKeys`. Invalidating
 * `all(companyId)` reloads the company's lists, counts, activity and imports,
 * and the skill and access role keys built on it (`skillKeys`,
 * `accessRoleKeys`).
 */
export const organisationKeys = {
	all: (companyId: string) => ["organisation", companyId] as const,
	branches: (companyId: string) =>
		[...organisationKeys.all(companyId), "branches"] as const,
	jobTitles: (companyId: string) =>
		[...organisationKeys.all(companyId), "job-titles"] as const,
	/** Every member search of the company, e.g. a heads picker's options. */
	members: (companyId: string) =>
		[...organisationKeys.all(companyId), "members"] as const,
	activeMembers: (companyId: string, search: string) =>
		[...organisationKeys.members(companyId), "ACTIVE", search] as const,
	activeBranchCount: (companyId: string) =>
		[...organisationKeys.all(companyId), "active-branch-count"] as const,
	activeDepartmentCount: (companyId: string) =>
		[...organisationKeys.all(companyId), "active-department-count"] as const,
	activeJobTitleCount: (companyId: string) =>
		[...organisationKeys.all(companyId), "active-job-title-count"] as const,
	activeSkillCount: (companyId: string) =>
		[...organisationKeys.all(companyId), "active-skill-count"] as const,
	recentActivity: (companyId: string) =>
		[...organisationKeys.all(companyId), "recent-activity"] as const,
	imports: (companyId: string) =>
		[...organisationKeys.all(companyId), "imports"] as const,
	import: (companyId: string, importId: string) =>
		[...organisationKeys.imports(companyId), importId] as const,
};

const totalSchema = z.object({
	page: z.object({ totalElements: z.number().int().nonnegative() }),
});

const auditEventSchema = z.object({
	auditEventId: z.string(),
	action: z.string(),
	entityType: z.string(),
	entityId: z.string().nullable(),
	entityName: z.string().nullable(),
	actorDisplayName: z.string().nullable(),
	occurredAt: z.iso.datetime({ offset: true }),
});

export type AuditEvent = z.infer<typeof auditEventSchema>;

const auditEventPageSchema = z.object({ content: z.array(auditEventSchema) });

/**
 * The audit entity types the Organisation Module reports on; `Company`
 * carries a workspace rename, `Skill` a change to the skill catalogue or a
 * bulk assignment, and `OrganisationImportJob` an organisation import's
 * summary.
 */
export const ORGANISATION_ENTITY_TYPES = [
	"Company",
	"Branch",
	"Department",
	"AccessRole",
	"JobTitle",
	"Skill",
	"OrganisationImportJob",
] as const;

/** A one-row page is enough: only the page's total is read. */
const countOf = async (path: string): Promise<number> =>
	(await apiRequest(path, totalSchema)).page.totalElements;

export const fetchActiveBranchCount = (companyId: string): Promise<number> =>
	countOf(`${companyPath(companyId)}/branches?status=ACTIVE&size=1`);

export const fetchActiveDepartmentCount = (
	companyId: string
): Promise<number> =>
	countOf(`${companyPath(companyId)}/departments?status=ACTIVE&size=1`);

export const fetchActiveJobTitleCount = (companyId: string): Promise<number> =>
	countOf(`${companyPath(companyId)}/job-titles?status=ACTIVE&size=1`);

/** Active skills of the company's catalogue; read under `skill:read`, company-wide. */
export const fetchActiveSkillCount = (companyId: string): Promise<number> =>
	countOf(`${companyPath(companyId)}/skill-overview?status=ACTIVE&size=1`);

/** The newest successful Organisation changes, newest first. */
export const fetchRecentActivity = async (
	companyId: string,
	size: number
): Promise<Array<AuditEvent>> => {
	const query = new URLSearchParams({ size: String(size) });
	for (const type of ORGANISATION_ENTITY_TYPES)
		query.append("entityType", type);
	return (
		await apiRequest(
			`${companyPath(companyId)}/audit-events?${query.toString()}`,
			auditEventPageSchema
		)
	).content;
};

/** The most rows the API returns in one page (`spring.data.web.pageable.max-page-size`). */
export const LIST_PAGE_SIZE = 100;

export const unitStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

/** A Branch's, Department's or Job title's lifecycle status. */
export type UnitStatus = z.infer<typeof unitStatusSchema>;

const branchSchema = z.object({
	branchId: z.string(),
	name: z.string(),
	code: z.string(),
	city: z.string(),
	country: z.string(),
	/** The IANA zone the branch's days, weeks and shift times are in, such as "Asia/Singapore". */
	timeZone: z.string(),
	status: unitStatusSchema,
	/** When the unit was created (an ISO instant); optional until every API the app talks to sends it. */
	createdAt: z.string().optional(),
});

export type Branch = z.infer<typeof branchSchema>;

export type CreateBranchBody = {
	name: string;
	code: string;
	city: string;
	country: string;
	timeZone: string;
	initialHeadCompanyMembershipIds: Array<string>;
};

/** Creates a Branch with its first heads; the server owns uniqueness and membership checks. */
export const createBranch = (
	companyId: string,
	body: CreateBranchBody
): Promise<Branch> =>
	apiRequest(`${companyPath(companyId)}/branches`, branchSchema, {
		method: "POST",
		body: {
			...body,
			name: body.name.trim(),
			code: body.code.trim().toUpperCase(),
			city: normalizeBranchCity(body.city),
		},
	});

const departmentSchema = z.object({
	departmentId: z.string(),
	branchId: z.string(),
	/** Optional until every API the app talks to sends it. */
	branchName: z.string().optional(),
	name: z.string(),
	status: unitStatusSchema,
	/** When the unit was created (an ISO instant); optional until every API the app talks to sends it. */
	createdAt: z.string().optional(),
});

export type Department = z.infer<typeof departmentSchema>;

export type CreateDepartmentBody = {
	name: string;
	initialHeadCompanyMembershipIds: Array<string>;
};

/**
 * Creates a Department in one Branch with its first heads. Heads not yet in
 * the Branch join it; the server owns uniqueness and membership checks.
 */
export const createDepartment = (
	companyId: string,
	branchId: string,
	body: CreateDepartmentBody
): Promise<Department> =>
	apiRequest(
		`${companyPath(companyId)}/branches/${encodeURIComponent(branchId)}/departments`,
		departmentSchema,
		{ method: "POST", body: { ...body, name: body.name.trim() } }
	);

const jobTitleSchema = z.object({
	jobTitleId: z.string(),
	/** The Department the title belongs to, and its Branch, by id and name. */
	branchId: z.string(),
	branchName: z.string(),
	departmentId: z.string(),
	departmentName: z.string(),
	name: z.string(),
	/** What the title is for, in a sentence; `null` when it has none. */
	description: z.string().nullable(),
	status: unitStatusSchema,
	/** How many people hold the title; they keep it while it is inactive. */
	holderCount: z.number().int().nonnegative(),
	/** When the unit was created (an ISO instant); optional until every API the app talks to sends it. */
	createdAt: z.string().optional(),
});

export type JobTitle = z.infer<typeof jobTitleSchema>;

/** The longest job title description the API keeps, after trimming. */
export const JOB_TITLE_DESCRIPTION_MAX_LENGTH = 300;

export type CreateJobTitleBody = { name: string; description: string };

/** A blank description is sent as none, so the list never shows an empty line. */
export const descriptionOrNull = (description: string | null): string | null =>
	description?.trim() || null;

/** Job titles live under their Department, as the API's routes do. */
const jobTitlesPath = (
	companyId: string,
	branchId: string,
	departmentId: string
): string =>
	`${companyPath(companyId)}/branches/${encodeURIComponent(branchId)}/departments/${encodeURIComponent(departmentId)}/job-titles`;

/** Creates an active Job title in one Department; the server owns uniqueness within it. */
export const createJobTitle = (
	companyId: string,
	branchId: string,
	departmentId: string,
	body: CreateJobTitleBody
): Promise<JobTitle> =>
	apiRequest(jobTitlesPath(companyId, branchId, departmentId), jobTitleSchema, {
		method: "POST",
		body: {
			name: body.name.trim(),
			description: descriptionOrNull(body.description),
		},
	});

/** A server-side sort on one of the API's allow-listed fields. */
export type ListSort = { field: string; desc: boolean };

export type ListQuery = {
	sort: ListSort;
	status?: UnitStatus;
	/** Departments and Job titles only: those of one Branch. */
	branchId?: string;
	/** Job titles only: those of one Department. */
	departmentId?: string;
};

/** A list resource's path with its page size, server sort and filters. */
export const listPath = (
	companyId: string,
	resource: string,
	{ sort, status, branchId, departmentId }: ListQuery
): string => {
	const search = new URLSearchParams({
		size: String(LIST_PAGE_SIZE),
		sort: `${sort.field},${sort.desc ? "desc" : "asc"}`,
	});
	if (status) search.set("status", status);
	if (branchId) search.set("branchId", branchId);
	if (departmentId) search.set("departmentId", departmentId);
	return `${companyPath(companyId)}/${resource}?${search.toString()}`;
};

/**
 * One page of the company's activity, newest first, limited to
 * `entityTypes` when given (every type otherwise); `page` counts from 1, as
 * people do.
 */
export const fetchActivityPage = (
	companyId: string,
	{
		page,
		size,
		entityTypes,
	}: { page: number; size: number; entityTypes?: ReadonlyArray<string> },
	signal?: AbortSignal
): Promise<ListPage<AuditEvent>> => {
	// The API counts pages from 0.
	const query = new URLSearchParams({
		page: String(page - 1),
		size: String(size),
	});
	for (const type of entityTypes ?? []) query.append("entityType", type);
	return fetchList(
		`${companyPath(companyId)}/audit-events?${query.toString()}`,
		auditEventSchema,
		signal
	);
};

export const companyMemberSchema = memberRefSchema.extend({
	status: unitStatusSchema,
});

export type CompanyMember = z.infer<typeof companyMemberSchema>;

/**
 * Active company members from the colleagues directory (membership id,
 * display name, status only), for the heads picker and role recipients.
 * Any active member may read it, so a recipient need not belong to the
 * unit a role is assigned at. Never searches private email addresses.
 */
export const searchCompanyMembers = (
	companyId: string,
	{ search, status, size }: { search: string; status: "ACTIVE"; size: number },
	signal?: AbortSignal
): Promise<ListPage<CompanyMember>> => {
	const query = new URLSearchParams({
		status,
		size: String(size),
		sort: "user.displayName",
	});
	if (search.trim()) query.set("search", search.trim());
	return fetchList(
		`${companyPath(companyId)}/me/colleagues?${query.toString()}`,
		companyMemberSchema,
		signal
	);
};

/** The company's branches; sortable by `name`, `code`, `city`, `status` or `createdAt`. */
export const fetchBranches = (
	companyId: string,
	query: ListQuery,
	signal?: AbortSignal
): Promise<ListPage<Branch>> =>
	fetchList(listPath(companyId, "branches", query), branchSchema, signal);

/** The company's departments across every branch; sortable by `name`, `status` or `createdAt`. */
export const fetchDepartments = (
	companyId: string,
	query: ListQuery,
	signal?: AbortSignal
): Promise<ListPage<Department>> =>
	fetchList(
		listPath(companyId, "departments", query),
		departmentSchema,
		signal
	);

/** The company's active departments, each with its Branch. */
export const fetchDepartmentUnits = (
	companyId: string
): Promise<ListPage<Department>> =>
	fetchList(
		listPath(companyId, "departments", {
			sort: { field: "name", desc: false },
			status: "ACTIVE",
		}),
		departmentSchema
	);

/** Replaces a Branch's details and status; the server owns uniqueness. */
export const updateBranch = (
	companyId: string,
	{ branchId, name, code, city, country, timeZone, status }: Branch
): Promise<Branch> =>
	apiRequest(
		`${companyPath(companyId)}/branches/${encodeURIComponent(branchId)}`,
		branchSchema,
		// Only what the API replaces: read-only fields such as createdAt never travel back.
		{ method: "PUT", body: { name, code, city, country, timeZone, status } }
	);

/** Replaces a Department's name and status; the server owns uniqueness. */
export const updateDepartment = (
	companyId: string,
	{ departmentId, branchId, name, status }: Department
): Promise<Department> =>
	apiRequest(
		`${companyPath(companyId)}/branches/${encodeURIComponent(branchId)}/departments/${encodeURIComponent(departmentId)}`,
		departmentSchema,
		// Only what the API replaces: read-only fields such as the Branch's name never travel back.
		{ method: "PUT", body: { name, status } }
	);

/** Replaces a Job title's name, description and status; its Department never changes. */
export const updateJobTitle = (
	companyId: string,
	{ jobTitleId, branchId, departmentId, name, description, status }: JobTitle
): Promise<JobTitle> =>
	apiRequest(
		`${jobTitlesPath(companyId, branchId, departmentId)}/${encodeURIComponent(jobTitleId)}`,
		jobTitleSchema,
		{
			method: "PUT",
			// The API replaces the whole title, so the description always goes along, even on a status change.
			body: {
				name: name.trim(),
				description: descriptionOrNull(description),
				status,
			},
		}
	);

/** The company's job titles; sortable by `name`, `status` or `createdAt`. */
export const fetchJobTitles = (
	companyId: string,
	query: ListQuery,
	signal?: AbortSignal
): Promise<ListPage<JobTitle>> =>
	fetchList(listPath(companyId, "job-titles", query), jobTitleSchema, signal);
