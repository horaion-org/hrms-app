import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useChangeAccessRoleHolders } from "@/features/organisation/useAccessRoleHolders";
import {
	memberProfileQuery,
	savedProfile,
	updateMemberProfile,
	type MemberProfileDetail,
	type MemberProfilePlace,
	type SkillValue,
	type UpdateMemberProfileBody,
} from "@/features/people/api";
import {
	departmentRoleChange,
	type MemberRole,
} from "@/features/people/memberRoles";
import { withPeopleNotice } from "@/features/people/peopleNoticeState";
import type { ProfileFormValues } from "@/features/people/profileFormSchema";
import { profileUpdateRequest } from "@/features/people/profileRequest";
import { useReplaceSkills } from "@/features/people/useSkills";

/**
 * Saves a person's profile, in the Department chosen for them. Then, when
 * `role` is given, it changes the system role at that Department, then
 * shows their profile again with a notice saying so. A refused save rejects
 * for the form to explain. A refused role does not: the profile is saved, so
 * the notice says so and that the role still needs changing. Given
 * `skills`, the complete new set is then sent, and a refusal of it is said
 * in the notice the same way.
 */
export const useEditProfile = (
	companyId: string,
	profile: MemberProfileDetail,
	/** The role held at their Department before saving; left out when roles can't be changed here. */
	role: { held: MemberRole | undefined } | undefined,
	/** Their skills as changed on the page; left out when unchanged or not changeable here. */
	skills?: ReadonlyArray<SkillValue>
): ((
	values: ProfileFormValues,
	place: MemberProfilePlace
) => Promise<void>) => {
	const client = useQueryClient();
	const navigate = useNavigate();
	const { membershipId } = profile;
	const save = useMutation({
		mutationFn: (body: UpdateMemberProfileBody) =>
			updateMemberProfile(companyId, membershipId, body),
		onSuccess: (saved) => {
			client.setQueryData<MemberProfileDetail>(
				memberProfileQuery(companyId, membershipId).queryKey,
				(previous) => savedProfile(saved, previous)
			);
			return Promise.all([
				client.invalidateQueries({ queryKey: ["people", companyId] }),
				client.invalidateQueries({
					queryKey: ["organisation", companyId, "members"],
				}),
			]);
		},
	});
	const assign = useChangeAccessRoleHolders(companyId);
	const replaceSkills = useReplaceSkills(companyId, membershipId);
	return async (values, place) => {
		const saved = await save.mutateAsync(
			profileUpdateRequest({
				...values,
				status: values.status ?? profile.status,
			})
		);
		const change =
			role &&
			departmentRoleChange({
				membershipId,
				held: role.held,
				chosen: values.accessRoleId,
				place,
			});
		let roleNotAssigned = false;
		if (change)
			try {
				// Granted before the old one goes, so a refusal leaves the role as it was.
				await assign.mutateAsync({ grants: change.grants });
				await assign.mutateAsync({ revokes: change.revokes });
			} catch {
				roleNotAssigned = true;
			}
		let skillsNotSaved = false;
		if (skills)
			try {
				await replaceSkills.mutateAsync(skills);
			} catch {
				skillsNotSaved = true;
			}
		await navigate({
			to: "/people/$membershipId",
			params: { membershipId },
			search: {},
			replace: true,
			state: withPeopleNotice({
				kind: "saved",
				name: saved.displayName,
				roleNotAssigned,
				...(skillsNotSaved && { skillsNotSaved }),
			}),
		});
	};
};
