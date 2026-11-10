import type { UseMutationResult } from "@tanstack/react-query";
import {
	deleteAccessRole,
	updateAccessRole,
	type AccessRole,
} from "@/features/organisation/api";
import {
	useRowChange,
	type StatusChange,
} from "@/features/organisation/useChangeListRow";

/** Activates or deactivates an access role, leaving its kind, name and permissions as they are. */
export const useSetAccessRoleStatus = (
	companyId: string
): UseMutationResult<AccessRole, Error, StatusChange<AccessRole>> =>
	useRowChange(companyId, ({ row, status }: StatusChange<AccessRole>) =>
		updateAccessRole(companyId, row.accessRoleId, {
			kind: row.kind,
			name: row.name,
			permissions: row.permissions,
			status,
		})
	);

/** Deletes an access role nobody holds. */
export const useDeleteAccessRole = (
	companyId: string
): UseMutationResult<void, Error, AccessRole> =>
	useRowChange(companyId, (role: AccessRole) =>
		deleteAccessRole(companyId, role.accessRoleId)
	);
