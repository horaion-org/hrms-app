import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	inviteImportMembers,
	type InvitationsSent,
} from "@/features/people/import/api";
import { peopleKeys } from "@/features/people/api";

/**
 * "Invite everyone from this import". Once sent, the import (its count of
 * people still to invite) and the People list (their Invited marker) are
 * read again.
 */
export const useImportInvitations = (
	companyId: string,
	importId: string
): UseMutationResult<InvitationsSent, Error, void> => {
	const client = useQueryClient();
	return useMutation({
		mutationFn: () => inviteImportMembers(companyId, importId),
		onSuccess: () =>
			client.invalidateQueries({ queryKey: peopleKeys.all(companyId) }),
	});
};
