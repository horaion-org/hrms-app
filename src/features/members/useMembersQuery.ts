import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationResult,
	type UseQueryResult,
} from "@tanstack/react-query";
import type { Member, MembershipImport } from "@/common/api";
import {
	deactivateMember,
	fetchMembers,
	grantRole,
	importMembers,
	inviteMember,
	reactivateMember,
	revokeRole,
} from "@/features/members/api";
import { notifyError, notifySuccess } from "@/store/useToastStore";

export const membersQueryKey = (companyId: string): Array<string> => [
	"members",
	companyId,
];

export function useMembersQuery(
	companyId: string
): UseQueryResult<Array<Member>, Error> {
	return useQuery({
		queryKey: membersQueryKey(companyId),
		queryFn: async () => fetchMembers(companyId),
	});
}

function useMembersInvalidator(companyId: string): () => void {
	const queryClient = useQueryClient();

	return (): void => {
		void queryClient.invalidateQueries({
			queryKey: membersQueryKey(companyId),
		});
	};
}

export function useInviteMemberMutation(
	companyId: string
): UseMutationResult<Member, Error, string> {
	const invalidate = useMembersInvalidator(companyId);

	return useMutation<Member, Error, string>({
		mutationFn: async (email: string) => inviteMember(companyId, email),
		onSuccess: (member) => {
			invalidate();
			notifySuccess(`Invited ${member.email}. They will receive an email.`);
		},
		onError: notifyError,
	});
}

export function useImportMembersMutation(
	companyId: string
): UseMutationResult<MembershipImport, Error, File> {
	const invalidate = useMembersInvalidator(companyId);

	return useMutation<MembershipImport, Error, File>({
		mutationFn: async (file: File) => importMembers(companyId, file),
		onSuccess: (result) => {
			invalidate();
			notifySuccess(
				`Imported ${String(result.imported.length)}, skipped ${String(
					result.skipped.length
				)}, failed ${String(result.failed.length)}.`
			);
		},
		onError: notifyError,
	});
}

export function useDeactivateMemberMutation(
	companyId: string
): UseMutationResult<void, Error, string> {
	const invalidate = useMembersInvalidator(companyId);

	return useMutation<void, Error, string>({
		mutationFn: async (memberId: string) =>
			deactivateMember(companyId, memberId),
		onSuccess: () => {
			invalidate();
			notifySuccess("Member deactivated.");
		},
		onError: notifyError,
	});
}

export function useReactivateMemberMutation(
	companyId: string
): UseMutationResult<Member, Error, string> {
	const invalidate = useMembersInvalidator(companyId);

	return useMutation<Member, Error, string>({
		mutationFn: async (memberId: string) =>
			reactivateMember(companyId, memberId),
		onSuccess: () => {
			invalidate();
			notifySuccess("Member reactivated.");
		},
		onError: notifyError,
	});
}

type RoleGrant = { memberId: string; roleId: string };

export function useGrantRoleMutation(
	companyId: string
): UseMutationResult<void, Error, RoleGrant> {
	const invalidate = useMembersInvalidator(companyId);

	return useMutation<void, Error, RoleGrant>({
		mutationFn: async ({ memberId, roleId }: RoleGrant) =>
			grantRole(companyId, memberId, roleId),
		onSuccess: () => {
			invalidate();
			notifySuccess("Role granted.");
		},
		onError: notifyError,
	});
}

export function useRevokeRoleMutation(
	companyId: string
): UseMutationResult<void, Error, RoleGrant> {
	const invalidate = useMembersInvalidator(companyId);

	return useMutation<void, Error, RoleGrant>({
		mutationFn: async ({ memberId, roleId }: RoleGrant) =>
			revokeRole(companyId, memberId, roleId),
		onSuccess: () => {
			invalidate();
			notifySuccess("Role revoked.");
		},
		onError: notifyError,
	});
}
