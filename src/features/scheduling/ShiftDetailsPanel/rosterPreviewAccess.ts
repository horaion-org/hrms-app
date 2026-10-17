import type { Access } from "@/features/workspace/useAccess";
import { departmentScope } from "@/features/workspace/scopes";

/** Presentation gates for demo interactions; these are not roster API permissions. */
export const rosterPreviewAccess = (
	access: Pick<Access, "can" | "status">,
	departmentId: string | undefined,
	editable: boolean
): Record<"edit" | "reassign" | "duplicate" | "delete", boolean> => {
	const ready =
		access.status === "ready" && departmentId !== undefined && editable;
	const target = departmentScope(departmentId ?? "");
	const read = ready && access.can("shift:read", target);
	return {
		edit: read && access.can("shift:update", target),
		reassign:
			read &&
			access.can("shift:update", target) &&
			access.can("member_profile:read", target),
		duplicate: read && access.can("shift:create", target),
		delete: read && access.can("shift:delete", target),
	};
};
