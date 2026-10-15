import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useChangeAccessRoleHolders } from "@/features/organisation/useAccessRoleHolders";
import {
	createMemberProfile,
	type CreateMemberProfileBody,
	type MemberProfilePlace,
} from "@/features/people/api";
import { withPeopleNotice } from "@/features/people/peopleNoticeState";
import type { ProfileFormValues } from "@/features/people/profileFormSchema";
import { profileRequest } from "@/features/people/profileRequest";

/**
 * Adds a person, then gives them the chosen system role in their Department,
 * then returns to the People list with a notice saying so. A refused create
 * rejects for the form to explain. A refused role does not: the person
 * exists, so the list says they were added and the role still needs assigning.
 */
export const useAddEmployee = (
	companyId: string
): ((
	values: ProfileFormValues,
	place: MemberProfilePlace | undefined,
	role: { shown: boolean }
) => Promise<void>) => {
	const client = useQueryClient();
	const navigate = useNavigate();
	const create = useMutation({
		mutationFn: ({
			place,
			body,
		}: {
			place: MemberProfilePlace | undefined;
			body: CreateMemberProfileBody;
		}) => createMemberProfile(companyId, place, body),
		onSuccess: () =>
			Promise.all([
				client.invalidateQueries({ queryKey: ["people", companyId] }),
				client.invalidateQueries({
					queryKey: ["organisation", companyId, "members"],
				}),
			]),
	});
	const assign = useChangeAccessRoleHolders(companyId);
	return async (values, place, role) => {
		const person = await create.mutateAsync({
			place,
			body: profileRequest(values),
		});
		let roleNotAssigned = false;
		if (place && role.shown && values.accessRoleId)
			try {
				await assign.mutateAsync({
					grants: [
						{
							companyMembershipId: person.membershipId,
							accessRoleId: values.accessRoleId,
							...place,
						},
					],
				});
			} catch {
				roleNotAssigned = true;
			}
		await navigate({
			to: "/people",
			state: withPeopleNotice({
				kind: "added",
				name: person.displayName,
				roleNotAssigned,
			}),
		});
	};
};
