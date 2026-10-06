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

/** A create that refreshes this company's lists, counts and activity on success. */
const useCompanyCreate = <TBody, TResult>(
	companyId: string,
	create: (body: TBody) => Promise<TResult>
): UseMutationResult<TResult, Error, TBody> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: create,
		onSuccess: () =>
			client.invalidateQueries({ queryKey: ["organisation", companyId] }),
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
