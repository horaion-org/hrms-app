import { apiRequest } from "@/common/api-client";
import type { Paged, PermissionKey, Role } from "@/common/api";

export async function fetchRoles(
	companyId: string,
	page = 0
): Promise<Paged<Role>> {
	return apiRequest<Paged<Role>>(
		`/api/v1/companies/${companyId}/roles?page=${String(page)}`
	);
}

/**
 * Creates a Custom Role. The API applies the Permission Subset Rule, refusing
 * any permission the caller does not themselves hold.
 */
export async function createRole(
	companyId: string,
	name: string,
	permissions: Array<PermissionKey>
): Promise<Role> {
	return apiRequest<Role>(`/api/v1/companies/${companyId}/roles`, {
		method: "POST",
		body: { name, permissions },
	});
}

export async function updateRole(
	companyId: string,
	roleId: string,
	name: string,
	permissions: Array<PermissionKey>
): Promise<Role> {
	return apiRequest<Role>(`/api/v1/companies/${companyId}/roles/${roleId}`, {
		method: "PUT",
		body: { name, permissions },
	});
}

export async function deleteRole(
	companyId: string,
	roleId: string
): Promise<void> {
	return apiRequest<void>(`/api/v1/companies/${companyId}/roles/${roleId}`, {
		method: "DELETE",
	});
}
