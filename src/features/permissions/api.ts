import { apiRequest } from "@/common/api-client";
import type { CatalogResource, PermissionKey } from "@/common/api";

/**
 * The permissions the caller actually holds in a Company, answered by the PDP.
 * It already accounts for Role Assignments, Permission Delegations, and their
 * validity windows. It decides what to offer, never whether to allow.
 */
export async function fetchPermissions(
	companyId: string
): Promise<Array<PermissionKey>> {
	return apiRequest<Array<PermissionKey>>(
		`/api/v1/companies/${companyId}/permissions`
	);
}

/** The platform-defined catalog every Company builds Roles from. */
export async function fetchPermissionCatalog(
	companyId: string
): Promise<Array<CatalogResource>> {
	return apiRequest<Array<CatalogResource>>(
		`/api/v1/companies/${companyId}/permission-catalog`
	);
}
