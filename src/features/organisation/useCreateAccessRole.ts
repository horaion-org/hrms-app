import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	createAccessRole,
	type AccessRole,
	type AccessRoleBody,
} from "@/features/organisation/api";

/** Refreshes the company's lists, counts and activity after creating an access role. */
export const useCreateAccessRole = (
	companyId: string
): UseMutationResult<AccessRole, Error, AccessRoleBody> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: (body: AccessRoleBody) => createAccessRole(companyId, body),
		// Reloaded in the background: the change is done when the API answers.
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: ["organisation", companyId] });
		},
	});
};
