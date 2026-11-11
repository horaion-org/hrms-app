import { z } from "zod";
import { apiRequest, apiRequestVoid, fetchList } from "@/common/api-client";
import { companyPath } from "@/common/companyPath";
import type { ListPage } from "@/common/schemas";
import {
	listPath,
	unitStatusSchema,
	type ListQuery,
	type UnitStatus,
} from "@/features/organisation/api";

/** The two kinds of access role, in the order a form offers them. */
export const ACCESS_ROLE_KINDS = ["COMPANY", "LOCAL"] as const;

const accessRoleKindSchema = z.enum(ACCESS_ROLE_KINDS);

/**
 * What a role is for, chosen when it is made. A `COMPANY` role may hold any
 * key and is given only at the whole company; a `LOCAL` role holds no
 * company-only key and is given at the whole company, a Branch or a
 * Department. It decides what a role may hold and where it may be given,
 * never what it allows: the API's authorization doesn't read it.
 */
export type AccessRoleKind = z.infer<typeof accessRoleKindSchema>;

export const isAccessRoleKind = (value: string): value is AccessRoleKind =>
	(ACCESS_ROLE_KINDS as ReadonlyArray<string>).includes(value);

const accessRoleSchema = z.object({
	accessRoleId: z.string(),
	name: z.string(),
	protectedRole: z.boolean(),
	/** The Company Owner role is a company role, and its kind never changes. */
	kind: accessRoleKindSchema,
	/** An inactive role stays assigned but grants nothing until it is activated again. */
	status: unitStatusSchema,
	permissions: z.array(z.string()),
	/** How many people hold the role; someone holding it at several places counts once. */
	holderCount: z.number().int().nonnegative(),
});

export type AccessRole = z.infer<typeof accessRoleSchema>;

export type CreateAccessRoleBody = AccessRoleBody;

/** The company's access roles; sortable by `name`, with no status. */
export const fetchAccessRoles = (
	companyId: string,
	query: ListQuery,
	signal?: AbortSignal
): Promise<ListPage<AccessRole>> =>
	fetchList(
		listPath(companyId, "access-roles", query),
		accessRoleSchema,
		signal
	);

const accessRoleHolderSchema = z.object({
	accessRoleAssignmentId: z.string(),
	companyMembershipId: z.string(),
	displayName: z.string(),
	/** An inactive assignment is kept but gives the person nothing until it is activated again. */
	status: unitStatusSchema,
	branchId: z.string().nullable(),
	branchName: z.string().nullable(),
	departmentId: z.string().nullable(),
	departmentName: z.string().nullable(),
});

/** One person holding an access role, and the Branch or Department it applies at, if not the whole company. */
export type AccessRoleHolder = z.infer<typeof accessRoleHolderSchema>;

/** Who holds an access role and where. */
export const fetchAccessRoleHolders = (
	companyId: string,
	accessRoleId: string,
	signal?: AbortSignal
): Promise<Array<AccessRoleHolder>> =>
	apiRequest(
		`${companyPath(companyId)}/access-roles/${encodeURIComponent(accessRoleId)}/access-role-assignments`,
		z.array(accessRoleHolderSchema),
		{ signal }
	);

const memberAssignmentSchema = z.object({
	accessRoleAssignmentId: z.string(),
	accessRoleId: z.string(),
	/** An inactive assignment is kept but gives the person nothing until it is activated again. */
	status: unitStatusSchema,
	branchId: z.string().nullable(),
	departmentId: z.string().nullable(),
});

/** One access role a person holds, and the Branch or Department it applies at, if not the whole company. */
export type MemberAccessRoleAssignment = z.infer<typeof memberAssignmentSchema>;

/** Every access role one person holds, at every place. */
export const fetchMemberAccessRoleAssignments = (
	companyId: string,
	companyMembershipId: string,
	signal?: AbortSignal
): Promise<Array<MemberAccessRoleAssignment>> =>
	apiRequest(
		`${companyPath(companyId)}/access-role-assignments?${new URLSearchParams({ companyMembershipId }).toString()}`,
		z.array(memberAssignmentSchema),
		{ signal }
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

/** Switches one assignment of an access role on or off without removing it. */
export const setAccessRoleAssignmentStatus = (
	companyId: string,
	accessRoleAssignmentId: string,
	status: UnitStatus
): Promise<void> =>
	apiRequestVoid(
		`${companyPath(companyId)}/access-role-assignments/${encodeURIComponent(accessRoleAssignmentId)}`,
		{ method: "PUT", body: { status } }
	);

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
	/** Required on every create and update; an update replaces it like the name. */
	kind: AccessRoleKind;
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

export type UpdateAccessRoleBody = AccessRoleBody & { status: UnitStatus };

/**
 * Replaces a role's kind, name, permissions and status; the server owns
 * uniqueness, what the person may grant and whether the kind fits.
 */
export const updateAccessRole = (
	companyId: string,
	accessRoleId: string,
	body: UpdateAccessRoleBody
): Promise<AccessRole> =>
	apiRequest(accessRolePath(companyId, accessRoleId), accessRoleSchema, {
		method: "PUT",
		body: { ...body, name: body.name.trim() },
	});

/** Deletes a role nobody holds; the server refuses one that is still assigned. */
export const deleteAccessRole = (
	companyId: string,
	accessRoleId: string
): Promise<void> =>
	apiRequestVoid(accessRolePath(companyId, accessRoleId), {
		method: "DELETE",
	});
