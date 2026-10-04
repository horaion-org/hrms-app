import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	createBranch,
	type Branch,
	type CreateBranchBody,
} from "@/features/organisation/api";

/** Refreshes the company's lists, counts and activity after creating a Branch. */
export const useCreateBranch = (
	companyId: string
): UseMutationResult<Branch, Error, CreateBranchBody> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateBranchBody) => createBranch(companyId, body),
		onSuccess: () =>
			client.invalidateQueries({ queryKey: ["organisation", companyId] }),
	});
};
