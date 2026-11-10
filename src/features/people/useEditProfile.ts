import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useChangeAccessRoleHolders } from "@/features/accessRoles/useAccessRoleHolders";
import type { AssignmentTarget } from "@/features/accessRoles/assignmentTargets";
import {
	memberProfileQuery,
	savedProfile,
	updateMemberProfile,
	type MemberProfileDetail,
	type MemberProfilePlace,
	type UpdateMemberProfileBody,
} from "@/features/people/api";
import {
	memberRoleChange,
	type MemberRole,
} from "@/features/accessRoles/memberRoles";
import { withPeopleNotice } from "@/features/people/peopleNoticeState";
import type { ProfileFormValues } from "@/features/people/profileFormSchema";
import { profileUpdateRequest } from "@/features/people/profileRequest";

/**
 * Saves a person's profile. Then, when `role` is given, it changes the
 * selected assignment at its independently chosen target, then
 * shows their profile again with a notice saying so. A refused save rejects
 * for the form to explain. A refused role does not: the profile is saved, so
 * the notice says so and that the role still needs changing. Skills are not
 * part of it: their card saves each change at once.
 */
export const useEditProfile = (
	companyId: string,
	profile: MemberProfileDetail,
	/** The selected assignment before saving; omitted when roles can't be changed here. */
	role: { held: MemberRole | undefined } | undefined
): ((
	values: ProfileFormValues,
	place: MemberProfilePlace | undefined,
	roleField: { shown: boolean; place?: AssignmentTarget }
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
	return async (values, _place, roleField) => {
		const saved = await save.mutateAsync(
			profileUpdateRequest({
				...values,
				status: values.status ?? profile.status,
			})
		);
		// A role field that was not offered changes nothing, so a role is never moved or removed unseen.
		const change =
			role &&
			roleField.shown &&
			memberRoleChange({
				membershipId,
				held: role.held,
				chosen: values.accessRoleId,
				place: roleField.place,
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
		await navigate({
			to: "/people/$membershipId",
			params: { membershipId },
			search: {},
			replace: true,
			state: withPeopleNotice({
				kind: "saved",
				name: saved.displayName,
				roleNotAssigned,
			}),
		});
	};
};
