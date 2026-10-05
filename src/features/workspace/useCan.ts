import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { workspaceQuery } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { holdsAnywhere, permissionsAt } from "@/features/workspace/scopes";

/**
 * Asks whether the person can do something in the current company: at company
 * level by default, or at the Branch or Department named by `scopeId`. The
 * answer is no until the workspace has loaded.
 *
 * It decides what is shown, never what is allowed: the API checks every
 * request, so a screen must still handle a refusal on anything it offered.
 *
 * The function keeps its identity while the workspace is unchanged, so column
 * definitions and other memoised values that close over it are not rebuilt on
 * every render.
 */
export const useCan = (): ((
	permission: PermissionKey,
	scopeId?: string
) => boolean) => {
	const companyId = useCurrentCompanyId();
	const { data } = useQuery(workspaceQuery);
	return useCallback(
		(permission, scopeId) =>
			data !== undefined &&
			permissionsAt(data, companyId, scopeId).includes(permission),
		[data, companyId]
	);
};

/**
 * Asks whether the person holds any of the keys at any scope of the current
 * company, which is what decides whether a Module appears in the menu.
 */
export const useCanAnywhere = (): ((
	permissions: ReadonlyArray<PermissionKey>
) => boolean) => {
	const companyId = useCurrentCompanyId();
	const { data } = useQuery(workspaceQuery);
	return useCallback(
		(permissions) =>
			data !== undefined && holdsAnywhere(data, companyId, permissions),
		[data, companyId]
	);
};
