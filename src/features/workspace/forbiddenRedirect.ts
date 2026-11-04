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
 * otherwise `undefined`. Nothing is judged before the company is chosen:
 * with no `companyId` (someone with several companies has not picked one
 * yet) there is no redirect, because the picker shows first and the loader
 * runs again once a company is settled. Without a workspace there is no
 * redirect either: a loader that catches the workspace failure (as
 * `/activity` does) lets the page explain it, and one that does not shows
 * the route's error. `replace` keeps
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
	/** The settled company; undefined while the person is still choosing one. */
	companyId: string | undefined;
	permission: PermissionKey;
	target: AccessTarget;
}): AnyRedirect | undefined => {
	if (companyId === undefined || !workspace) return undefined;
	return canAny(accessIndexOf(workspace, companyId), [permission], target)
		? undefined
		: redirect({ to: "/forbidden", replace: true });
};
