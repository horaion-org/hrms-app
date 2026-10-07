import {
	useMutation,
	useQueryClient,
	type UseMutationResult,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	memberProfileQuery,
	savedProfile,
	resendInvitation,
	updateMemberProfile,
	type MemberProfileDetail,
	type MemberStatus,
} from "@/features/people/api";
import {
	withPeopleNotice,
	type PeopleNotice,
} from "@/features/people/peopleNoticeState";
import {
	profileEditValues,
	profileUpdateRequest,
} from "@/features/people/profileRequest";

/** Shows the person's profile again with a notice of what just happened. */
const useShowNotice = (
	membershipId: string
): ((notice: PeopleNotice) => Promise<void>) => {
	const navigate = useNavigate();
	return (notice) =>
		navigate({
			to: "/people/$membershipId",
			params: { membershipId },
			search: {},
			replace: true,
			state: withPeopleNotice(notice),
		});
};

/**
 * Deactivates or reactivates a person: their saved profile is sent back
 * with only the status changed, since an update replaces the profile.
 */
export const useSetProfileStatus = (
	companyId: string,
	profile: MemberProfileDetail
): UseMutationResult<MemberProfileDetail, Error, MemberStatus> => {
	const client = useQueryClient();
	const show = useShowNotice(profile.membershipId);
	return useMutation({
		mutationFn: (status: MemberStatus) =>
			updateMemberProfile(
				companyId,
				profile.membershipId,
				profileUpdateRequest({ ...profileEditValues(profile), status })
			),
		onSuccess: async (saved) => {
			client.setQueryData<MemberProfileDetail>(
				memberProfileQuery(companyId, profile.membershipId).queryKey,
				(previous) => savedProfile(saved, previous)
			);
			await client.invalidateQueries({ queryKey: ["people", companyId] });
			await show({
				kind: saved.status === "ACTIVE" ? "reactivated" : "deactivated",
				name: saved.displayName,
				roleNotAssigned: false,
			});
		},
	});
};

/** Emails the person a new invitation to log in. */
export const useResendInvitation = (
	companyId: string,
	profile: MemberProfileDetail
): UseMutationResult<void, Error, void> => {
	const show = useShowNotice(profile.membershipId);
	return useMutation({
		mutationFn: () => resendInvitation(companyId, profile.membershipId),
		onSuccess: () =>
			show({
				kind: "invited",
				name: profile.displayName,
				roleNotAssigned: false,
			}),
	});
};
