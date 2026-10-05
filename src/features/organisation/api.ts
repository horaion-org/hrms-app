import { normalizeBranchCity } from "@/features/organisation/city";
import { z } from "zod";
import { apiRequest, apiRequestVoid } from "@/common/api-client";

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

/** The audit entity types the Organisation Module reports on. */
export const ORGANISATION_ENTITY_TYPES = [
	"Branch",
	"Department",
	"AccessRole",
	"JobTitle",
] as const;

const companyPath = (companyId: string): string =>
	`/api/v1/companies/${encodeURIComponent(companyId)}`;

/** A one-row page is enough: only the page's total is read. */
const countOf = async (path: string): Promise<number> =>
	(await apiRequest(path, totalSchema)).page.totalElements;

export const fetchActiveBranchCount = (companyId: string): Promise<number> =>
	countOf(`${companyPath(companyId)}/branches?status=ACTIVE&size=1`);

export const fetchActiveDepartmentCount = (
	companyId: string
): Promise<number> =>
	countOf(`${companyPath(companyId)}/departments?status=ACTIVE&size=1`);

export const fetchAccessRoleCount = (companyId: string): Promise<number> =>
	countOf(`${companyPath(companyId)}/access-roles?size=1`);

export const fetchActiveJobTitleCount = (companyId: string): Promise<number> =>
	countOf(`${companyPath(companyId)}/job-titles?status=ACTIVE&size=1`);

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

const unitStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

/** A Branch's, Department's or Job title's lifecycle status. */
export type UnitStatus = z.infer<typeof unitStatusSchema>;

const branchSchema = z.object({
	branchId: z.string(),
	name: z.string(),
	code: z.string(),
	city: z.string(),
	country: z.string(),
	status: unitStatusSchema,
});

export type Branch = z.infer<typeof branchSchema>;

export type CreateBranchBody = {
	name: string;
	code: string;
	city: string;
	country: string;
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
	name: z.string(),
	status: unitStatusSchema,
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
	name: z.string(),
	status: unitStatusSchema,
});

export type JobTitle = z.infer<typeof jobTitleSchema>;

export type CreateJobTitleBody = { name: string };

/** Creates an active, company-wide Job title; the server owns uniqueness. */
export const createJobTitle = (
	companyId: string,
	body: CreateJobTitleBody
): Promise<JobTitle> =>
	apiRequest(`${companyPath(companyId)}/job-titles`, jobTitleSchema, {
		method: "POST",
		body: { name: body.name.trim() },
	});

const accessRoleSchema = z.object({
	accessRoleId: z.string(),
	name: z.string(),
	protectedRole: z.boolean(),
	permissions: z.array(z.string()),
	/** How many people hold the role; someone holding it at several places counts once. */
	holderCount: z.number().int().nonnegative(),
});

export type AccessRole = z.infer<typeof accessRoleSchema>;

export type CreateAccessRoleBody = AccessRoleBody;

const pageOf = <T extends z.ZodType>(
	item: T
): z.ZodObject<{
	content: z.ZodArray<T>;
	page: typeof totalSchema.shape.page;
}> => z.object({ content: z.array(item), page: totalSchema.shape.page });

/** One page of a list and how many rows match in all. */
export type ListPage<T> = { items: Array<T>; total: number };

/** A server-side sort on one of the API's allow-listed fields. */
export type ListSort = { field: string; desc: boolean };

export type ListQuery = { sort: ListSort; status?: UnitStatus };

const listPath = (
	companyId: string,
	resource: string,
	{ sort, status }: ListQuery
): string => {
	const search = new URLSearchParams({
		size: String(LIST_PAGE_SIZE),
		sort: `${sort.field},${sort.desc ? "desc" : "asc"}`,
	});
	if (status) search.set("status", status);
	return `${companyPath(companyId)}/${resource}?${search.toString()}`;
};

const fetchList = async <T extends z.ZodType>(
	path: string,
	item: T
): Promise<ListPage<z.infer<T>>> => {
	const page = await apiRequest(path, pageOf(item));
	return { items: page.content, total: page.page.totalElements };
};

export const companyMemberSchema = z.object({
	membershipId: z.string(),
	displayName: z.string(),
	status: unitStatusSchema,
});

export type CompanyMember = z.infer<typeof companyMemberSchema>;

/** Active people for the heads picker; never searches private email addresses. */
export const searchCompanyMembers = (
	companyId: string,
	{ search, status, size }: { search: string; status: "ACTIVE"; size: number }
): Promise<ListPage<CompanyMember>> => {
	const query = new URLSearchParams({
		status,
		size: String(size),
		sort: "user.displayName",
	});
	if (search.trim()) query.set("search", search.trim());
	return fetchList(
		`${companyPath(companyId)}/members?${query.toString()}`,
		companyMemberSchema
	);
};

/** The company's branches; sortable by `name`, `code`, `city` or `status`. */
export const fetchBranches = (
	companyId: string,
	query: ListQuery
): Promise<ListPage<Branch>> =>
	fetchList(listPath(companyId, "branches", query), branchSchema);

/** The company's departments across every branch; sortable by `name` or `status`. */
export const fetchDepartments = (
	companyId: string,
	query: ListQuery
): Promise<ListPage<Department>> =>
	fetchList(listPath(companyId, "departments", query), departmentSchema);

/** The company's access roles ("System Roles"); sortable by `name`, with no status. */
export const fetchAccessRoles = (
	companyId: string,
	query: Omit<ListQuery, "status">
): Promise<ListPage<AccessRole>> =>
	fetchList(listPath(companyId, "access-roles", query), accessRoleSchema);

/** A Department with the Branch it belongs to, for choosing where a role applies. */
const departmentUnitSchema = departmentSchema.extend({ branchId: z.string() });

export type DepartmentUnit = z.infer<typeof departmentUnitSchema>;

/** The company's active departments, each with its Branch. */
export const fetchDepartmentUnits = (
	companyId: string
): Promise<ListPage<DepartmentUnit>> =>
	fetchList(
		listPath(companyId, "departments", {
			sort: { field: "name", desc: false },
			status: "ACTIVE",
		}),
		departmentUnitSchema
	);

const accessRoleHolderSchema = z.object({
	accessRoleAssignmentId: z.string(),
	companyMembershipId: z.string(),
	displayName: z.string(),
	branchName: z.string().nullable(),
	departmentName: z.string().nullable(),
});

/** One person holding an access role, and the Branch or Department it applies at, if not the whole company. */
export type AccessRoleHolder = z.infer<typeof accessRoleHolderSchema>;

/** Who holds an access role and where. */
export const fetchAccessRoleHolders = (
	companyId: string,
	accessRoleId: string
): Promise<Array<AccessRoleHolder>> =>
	apiRequest(
		`${companyPath(companyId)}/access-roles/${encodeURIComponent(accessRoleId)}/access-role-assignments`,
		z.array(accessRoleHolderSchema)
	);

/** Who gets which role, and the Branch or Department it applies at; neither means the whole company. */
export type AccessRoleGrant = {
	companyMembershipId: string;
	accessRoleId: string;
	branchId?: string;
	departmentId?: string;
};

/** Assigns an access role. Where it applies is the URL, as the API requires. */
export const grantAccessRole = async (
	companyId: string,
	{ branchId, departmentId, ...body }: AccessRoleGrant
): Promise<void> => {
	const branch = branchId ? `/branches/${encodeURIComponent(branchId)}` : "";
	const department = departmentId
		? `/departments/${encodeURIComponent(departmentId)}`
		: "";
	await apiRequestVoid(
		`${companyPath(companyId)}${branch}${department}/access-role-assignments`,
		{ method: "POST", body }
	);
};

/** Removes one assignment of an access role. */
export const revokeAccessRole = (
	companyId: string,
	accessRoleAssignmentId: string
): Promise<void> =>
	apiRequestVoid(
		`${companyPath(companyId)}/access-role-assignments/${encodeURIComponent(accessRoleAssignmentId)}`,
		{ method: "DELETE" }
	);

const accessRolePath = (companyId: string, accessRoleId: string): string =>
	`${companyPath(companyId)}/access-roles/${encodeURIComponent(accessRoleId)}`;

/** One access role with the permission keys it grants. */
export const fetchAccessRole = (
	companyId: string,
	accessRoleId: string
): Promise<AccessRole> =>
	apiRequest(accessRolePath(companyId, accessRoleId), accessRoleSchema);

export type AccessRoleBody = {
	name: string;
	/** The role's whole permission set; on an update, keys left out are removed. */
	permissions: Array<string>;
};

/** Creates an access role; the server owns uniqueness and what the person may grant. */
export const createAccessRole = (
	companyId: string,
	body: AccessRoleBody
): Promise<AccessRole> =>
	apiRequest(`${companyPath(companyId)}/access-roles`, accessRoleSchema, {
		method: "POST",
		body: { ...body, name: body.name.trim() },
	});

/** Replaces a role's name and permissions; the server owns uniqueness and what the person may grant. */
export const updateAccessRole = (
	companyId: string,
	accessRoleId: string,
	body: AccessRoleBody
): Promise<AccessRole> =>
	apiRequest(accessRolePath(companyId, accessRoleId), accessRoleSchema, {
		method: "PUT",
		body: { ...body, name: body.name.trim() },
	});
/** The company's job titles; sortable by `name` or `status`. */
export const fetchJobTitles = (
	companyId: string,
	query: ListQuery
): Promise<ListPage<JobTitle>> =>
	fetchList(listPath(companyId, "job-titles", query), jobTitleSchema);
