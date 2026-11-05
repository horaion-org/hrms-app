import { redirect, type AnyRedirect } from "@tanstack/react-router";
import type { Workspace } from "@/features/workspace/api";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import {
	accessIndexOf,
	canAny,
	type AccessTarget,
} from "@/features/workspace/scopes";

/**
 * For a route loader to return: a redirect to the Forbidden page when the
 * loaded workspace does not grant the page's key where the page needs it,
 * otherwise `undefined`. Without a workspace there is no redirect: a loader
 * that catches the workspace failure (as `/activity` does) lets the page
 * explain it, and one that does not shows the route's error. `replace` keeps
 * the refused URL out of history, so Go back returns to where the person
 * came from.
 *
 * Presentation only, like every workspace answer: the API still checks
 * each request.
 */
export const forbiddenRedirect = ({
	workspace,
	companyId,
	permission,
	target,
}: {
	workspace: Workspace | undefined;
	companyId: string;
	permission: PermissionKey;
	target: AccessTarget;
}): AnyRedirect | undefined => {
	if (!workspace) return undefined;
	return canAny(accessIndexOf(workspace, companyId), [permission], target)
		? undefined
		: redirect({ to: "/forbidden", replace: true });
};
