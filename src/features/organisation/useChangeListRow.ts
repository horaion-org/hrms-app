import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	deleteAccessRole,
	updateAccessRole,
	updateBranch,
	updateDepartment,
	updateJobTitle,
	type AccessRole,
	type Branch,
	type Department,
	type JobTitle,
	type UnitStatus,
} from "@/features/organisation/api";
import { workspaceQuery } from "@/features/workspace/api";

/**
 * A change made from a list row. It refreshes the company's lists and
 * activity, and the workspace too, because activating, deactivating or
 * deleting something can change what the person themselves may do.
 */
const useRowChange = <TVariables, TResult>(
	companyId: string,
	change: (variables: TVariables) => Promise<TResult>
): UseMutationResult<TResult, Error, TVariables> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: change,
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ["organisation", companyId] }),
				client.invalidateQueries({ queryKey: workspaceQuery.queryKey }),
			]),
	});
};

export type StatusChange<T> = { row: T; status: UnitStatus };

/** Activates or deactivates a Branch, leaving its other details as they are. */
export const useSetBranchStatus = (
	companyId: string
): UseMutationResult<Branch, Error, StatusChange<Branch>> =>
	useRowChange(companyId, ({ row, status }: StatusChange<Branch>) =>
		updateBranch(companyId, { ...row, status })
	);

/** Activates or deactivates a Department, leaving its name as it is. */
export const useSetDepartmentStatus = (
	companyId: string
): UseMutationResult<Department, Error, StatusChange<Department>> =>
	useRowChange(companyId, ({ row, status }: StatusChange<Department>) =>
		updateDepartment(companyId, { ...row, status })
	);

/** Renames a Job title; its status and Department stay as they are. */
export const useUpdateJobTitle = (
	companyId: string
): UseMutationResult<JobTitle, Error, JobTitle> =>
	useRowChange(companyId, (jobTitle: JobTitle) =>
		updateJobTitle(companyId, jobTitle)
	);

/** Activates or deactivates a Job title, leaving its name as it is. */
export const useSetJobTitleStatus = (
	companyId: string
): UseMutationResult<JobTitle, Error, StatusChange<JobTitle>> =>
	useRowChange(companyId, ({ row, status }: StatusChange<JobTitle>) =>
		updateJobTitle(companyId, { ...row, status })
	);

/** Activates or deactivates an access role, leaving its name and permissions as they are. */
export const useSetAccessRoleStatus = (
	companyId: string
): UseMutationResult<AccessRole, Error, StatusChange<AccessRole>> =>
	useRowChange(companyId, ({ row, status }: StatusChange<AccessRole>) =>
		updateAccessRole(companyId, row.accessRoleId, {
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
