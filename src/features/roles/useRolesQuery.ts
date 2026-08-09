import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import type { Paged, PermissionKey, Role } from "@/common/api";
import {
	createRole,
	deleteRole,
	fetchRoles,
	updateRole,
} from "@/features/roles/api";
import { notifyError, notifySuccess } from "@/store/useToastStore";

export const rolesQueryKey = (companyId: string): Array<string> => [
	"roles",
	companyId,
];

export function useRolesQuery(
	companyId: string
): UseQueryResult<Paged<Role>, Error> {
	return useQuery({
		queryKey: rolesQueryKey(companyId),
		queryFn: async () => fetchRoles(companyId),
	});
}

function useRolesInvalidator(companyId: string): () => void {
	const queryClient = useQueryClient();

	return (): void => {
		void queryClient.invalidateQueries({ queryKey: rolesQueryKey(companyId) });
	};
}

export type RoleDraft = {
	id?: string;
	name: string;
	permissions: Array<PermissionKey>;
};

export function useSaveRoleMutation(
	companyId: string
): UseMutationResult<Role, Error, RoleDraft> {
	const invalidate = useRolesInvalidator(companyId);

	return useMutation<Role, Error, RoleDraft>({
		mutationFn: async (draft: RoleDraft) =>
			draft.id === undefined
				? createRole(companyId, draft.name, draft.permissions)
				: updateRole(companyId, draft.id, draft.name, draft.permissions),
		onSuccess: (role) => {
			invalidate();
			notifySuccess(`Saved ${role.name}.`);
		},
		onError: notifyError,
	});
}

export function useDeleteRoleMutation(
	companyId: string
): UseMutationResult<void, Error, string> {
	const invalidate = useRolesInvalidator(companyId);

	return useMutation<void, Error, string>({
		mutationFn: async (roleId: string) => deleteRole(companyId, roleId),
		onSuccess: () => {
			invalidate();
			notifySuccess("Role deleted.");
		},
		onError: notifyError,
	});
}
