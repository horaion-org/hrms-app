import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import {
	addMemberTerms,
	cancelMemberTerms,
	correctMemberTerms,
	reloadTermsReads,
	type MemberTerms,
	type MemberTermsBody,
} from "@/features/employmentTerms/api";

type Corrected = { entryId: string; body: MemberTermsBody };

export type MemberTermsActions = {
	add: UseMutationResult<MemberTerms, Error, MemberTermsBody>;
	correct: UseMutationResult<MemberTerms, Error, Corrected>;
	cancel: UseMutationResult<void, Error, string>;
};

/**
 * Giving one person terms from a date, correcting an entry of their history,
 * and cancelling a change that hasn't started. The catalogue's counts move
 * with them, so each success reloads every employment terms query.
 */
export const useMemberTermsActions = (
	companyId: string,
	membershipId: string
): MemberTermsActions => {
	const client = useQueryClient();
	const reload = (): Promise<void> => reloadTermsReads(client, companyId);
	return {
		add: useMutation({
			meta: { successMessage: false },
			mutationFn: (body: MemberTermsBody) =>
				addMemberTerms(companyId, membershipId, body),
			onSuccess: reload,
		}),
		correct: useMutation({
			meta: { successMessage: false },
			mutationFn: ({ entryId, body }: Corrected) =>
				correctMemberTerms(companyId, membershipId, entryId, body),
			onSuccess: reload,
		}),
		cancel: useMutation({
			meta: { successMessage: false },
			mutationFn: (entryId: string) =>
				cancelMemberTerms(companyId, membershipId, entryId),
			onSuccess: reload,
		}),
	};
};
