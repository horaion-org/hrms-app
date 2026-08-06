import { createContext, use } from "react";
import type { Me, Membership, PermissionKey } from "@/common/api";

export type Workspace = {
	me: Me;
	membership: Membership;
	companyId: string;
	permissions: ReadonlySet<PermissionKey>;
};

export const WorkspaceContext = createContext<Workspace | null>(null);

/**
 * The resolved Company and the caller's standing in it. Only available beneath
 * a guarded route, which is why this throws rather than returning null: a
 * component reaching for it outside the shell is a wiring mistake.
 */
export function useWorkspace(): Workspace {
	const workspace = use(WorkspaceContext);

	if (workspace === null) {
		throw new Error("useWorkspace must be used inside a guarded route.");
	}

	return workspace;
}

/**
 * Whether the caller holds a permission. Hiding an action is a courtesy; the
 * API enforces every decision and fails closed, so a screen must still handle
 * a refusal on anything it chose to show.
 */
export function useHasPermission(): (key: PermissionKey) => boolean {
	const { permissions } = useWorkspace();

	return (key: PermissionKey): boolean => permissions.has(key);
}
