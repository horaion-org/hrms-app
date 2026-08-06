import type { ReactNode } from "react";
import type { PermissionKey } from "@/common/api";
import type { FunctionComponent } from "@/common/types";
import { useHasPermission } from "@/features/session/workspace-context";

type PermissionGateProps = {
	/** Any one of these permits the children to render. */
	permission: PermissionKey | Array<PermissionKey>;
	fallback?: ReactNode;
	children: ReactNode;
};

/**
 * Renders its children only when the caller holds one of the given
 * permissions. This chooses what to offer; it does not authorise anything.
 */
export const PermissionGate = ({
	permission,
	fallback = null,
	children,
}: PermissionGateProps): FunctionComponent => {
	const hasPermission = useHasPermission();
	const required = Array.isArray(permission) ? permission : [permission];
	const allowed = required.some((key) => hasPermission(key));

	return <>{allowed ? children : fallback}</>;
};
