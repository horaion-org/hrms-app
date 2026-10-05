import type { ReactNode } from "react";
import type { FunctionComponent } from "@/common/types";
import type { PermissionKey } from "@/features/workspace/permissionKeys";
import { useCan } from "@/features/workspace/useCan";

export type CanProps = {
	/** Holding any one of these shows the children. */
	permission: PermissionKey | ReadonlyArray<PermissionKey>;
	/** The Branch or Department the action acts on; company level when omitted. */
	scope?: string;
	/** Shown instead when the person cannot; nothing by default. */
	fallback?: ReactNode;
	children: ReactNode;
};

/**
 * Shows its children only when the person can do one of these things at the
 * given scope, as the workspace says. It decides what is drawn, never what is
 * allowed: the API decides that on every request.
 */
export const Can = ({
	permission,
	scope,
	fallback = null,
	children,
}: CanProps): FunctionComponent => {
	const can = useCan();
	const keys = typeof permission === "string" ? [permission] : permission;
	return <>{keys.some((key) => can(key, scope)) ? children : fallback}</>;
};
