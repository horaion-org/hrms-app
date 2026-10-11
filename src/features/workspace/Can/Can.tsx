import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import type { AccessTarget } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** The keys asked about: one, any of several (alternatives), or all of several (prerequisites). */
type CanKeys =
	| { permission: PermissionKey; anyOf?: never; allOf?: never }
	| {
			anyOf: ReadonlyArray<PermissionKey>;
			permission?: never;
			allOf?: never;
	  }
	| {
			allOf: ReadonlyArray<PermissionKey>;
			permission?: never;
			anyOf?: never;
	  };

export type CanProps = CanKeys & {
	/**
	 * Where the action acts: a `ScopeRef` such as `COMPANY_SCOPE` or a
	 * Department, or `"anywhere"` for any node of the company, as a Module's
	 * menu entry asks. Always explicit: there is no company default.
	 */
	at: AccessTarget;
	/** Shown instead when the person cannot; nothing by default. */
	fallback?: ReactNode;
	children: ReactNode;
};

/**
 * Shows its children only when the person can do this at the given target,
 * as the workspace says. It decides what is drawn, never what is allowed:
 * the API decides that on every request.
 */
export const Can = ({
	permission,
	anyOf,
	allOf,
	at,
	fallback = null,
	children,
}: CanProps): FunctionComponent => {
	const access = useAccess();
	const allowed = allOf
		? access.canAll(allOf, at)
		: access.canAny(anyOf ?? (permission ? [permission] : []), at);
	return <>{allowed ? children : fallback}</>;
};
