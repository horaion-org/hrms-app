import { normalizeBranchCity } from "@/features/organisation/city";
import { z } from "zod";
import { apiRequest } from "@/common/api-client";

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

/** A Branch's or Department's lifecycle status. */
export type UnitStatus = z.infer<typeof unitStatusSchema>;

const branchSchema = z.object({
	branchId: z.string(),
	name: z.string(),
	code: z.string(),
	city: z.string(),
	status: unitStatusSchema,
});

export type Branch = z.infer<typeof branchSchema>;

export type CreateBranchBody = {
	name: string;
	code: string;
	city: string;
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

const accessRoleSchema = z.object({
	accessRoleId: z.string(),
	name: z.string(),
	protectedRole: z.boolean(),
	permissions: z.array(z.string()),
});

export type AccessRole = z.infer<typeof accessRoleSchema>;

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
