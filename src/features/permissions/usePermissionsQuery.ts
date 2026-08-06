import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { CatalogResource, PermissionKey } from "@/common/api";
import {
	fetchPermissionCatalog,
	fetchPermissions,
} from "@/features/permissions/api";

export const permissionsQueryKey = (companyId: string): Array<string> => [
	"permissions",
	companyId,
];

export const permissionCatalogQueryKey = (companyId: string): Array<string> => [
	"permission-catalog",
	companyId,
];

export function usePermissionsQuery(
	companyId: string | undefined
): UseQueryResult<Array<PermissionKey>, Error> {
	return useQuery({
		queryKey: permissionsQueryKey(companyId ?? ""),
		queryFn: async () => fetchPermissions(companyId ?? ""),
		enabled: companyId !== undefined,
		staleTime: 30_000,
	});
}

export function usePermissionCatalogQuery(
	companyId: string | undefined
): UseQueryResult<Array<CatalogResource>, Error> {
	return useQuery({
		queryKey: permissionCatalogQueryKey(companyId ?? ""),
		queryFn: async () => fetchPermissionCatalog(companyId ?? ""),
		enabled: companyId !== undefined,
		// The catalog is platform-defined and code-versioned; it does not move.
		staleTime: Number.POSITIVE_INFINITY,
	});
}
