import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	createAccessRole,
	createDepartment,
	createJobTitle,
	type AccessRole,
	type CreateAccessRoleBody,
	type CreateDepartmentBody,
	type CreateJobTitleBody,
	type Department,
	type JobTitle,
} from "@/features/organisation/api";
import { workspaceQuery } from "@/features/workspace/api";

/** Refreshes company lists and workspace access, including newly created units. */
const useCompanyCreate = <TBody, TResult>(
	companyId: string,
	create: (body: TBody) => Promise<TResult>
): UseMutationResult<TResult, Error, TBody> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: create,
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ["organisation", companyId] }),
				client.invalidateQueries({ queryKey: workspaceQuery.queryKey }),
			]),
	});
};

export type CreateDepartmentVariables = {
	branchId: string;
	body: CreateDepartmentBody;
};

export const useCreateDepartment = (
	companyId: string
): UseMutationResult<Department, Error, CreateDepartmentVariables> =>
	useCompanyCreate(companyId, ({ branchId, body }: CreateDepartmentVariables) =>
		createDepartment(companyId, branchId, body)
	);

export type CreateJobTitleVariables = {
	branchId: string;
	departmentId: string;
	body: CreateJobTitleBody;
};

export const useCreateJobTitle = (
	companyId: string
): UseMutationResult<JobTitle, Error, CreateJobTitleVariables> =>
	useCompanyCreate(
		companyId,
		({ branchId, departmentId, body }: CreateJobTitleVariables) =>
			createJobTitle(companyId, branchId, departmentId, body)
	);

export const useCreateAccessRole = (
	companyId: string
): UseMutationResult<AccessRole, Error, CreateAccessRoleBody> =>
	useCompanyCreate(companyId, (body: CreateAccessRoleBody) =>
		createAccessRole(companyId, body)
	);
