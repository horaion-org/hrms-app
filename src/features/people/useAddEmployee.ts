import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	correctMemberTerms,
	fetchMemberTerms,
} from "@/features/employmentTerms/api";
import { useChangeAccessRoleHolders } from "@/features/accessRoles/useAccessRoleHolders";
import type { AssignmentTarget } from "@/features/accessRoles/assignmentTargets";
import {
	createMemberProfile,
	type CreateMemberProfileBody,
	type MemberProfilePlace,
} from "@/features/people/api";
import { withPeopleNotice } from "@/features/people/peopleNoticeState";
import type { ProfileFormValues } from "@/features/people/profileFormSchema";
import { profileRequest } from "@/features/people/profileRequest";

/**
 * Adds a person, then gives them the chosen system role at its explicit target,
 * then their employment terms from their hire date (or today), then returns
 * to the People list with a notice saying so. A refused create rejects for
 * the form to explain. A refused role or terms does not: the person exists,
 * so the list says they were added and what still needs doing.
 *
 * The API gives every new person a first entry on the Default from their
 * hire date. Other terms chosen here correct that entry in place (a second
 * call); if it fails they keep the Default and the notice says so.
 */
/** The terms chosen on Add employee, and the Default every new person starts on. */
export type ChosenTerms = {
	id: string;
	name: string;
	defaultTerms: { id: string; name: string };
};

export const useAddEmployee = (
	companyId: string
): ((
	values: ProfileFormValues,
	place: MemberProfilePlace | undefined,
	role: { shown: boolean; place?: AssignmentTarget },
	terms?: ChosenTerms
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
	return async (values, place, role, terms) => {
		const person = await create.mutateAsync({
			place,
			body: profileRequest(values),
		});
		let roleNotAssigned = false;
		if (role.place && role.shown && values.accessRoleId)
			try {
				await assign.mutateAsync({
					grants: [
						{
							companyMembershipId: person.membershipId,
							accessRoleId: values.accessRoleId,
							branchId: role.place.branchId,
							departmentId: role.place.departmentId,
						},
					],
				});
			} catch {
				roleNotAssigned = true;
			}
		let termsNotSet: { chosen: string; kept: string } | undefined;
		if (terms && terms.id !== terms.defaultTerms.id)
			try {
				const { history } = await fetchMemberTerms(
					companyId,
					person.membershipId
				);
				const first = history[history.length - 1];
				if (!first) throw new Error("No first entry to correct");
				await correctMemberTerms(companyId, person.membershipId, first.id, {
					employmentTermsId: terms.id,
					effectiveFrom: first.effectiveFrom,
					contractedWeekMinutes: null,
					contractedDayMinutes: null,
				});
			} catch {
				termsNotSet = { chosen: terms.name, kept: terms.defaultTerms.name };
			}
		await navigate({
			to: "/people",
			state: withPeopleNotice({
				kind: "added",
				name: person.displayName,
				roleNotAssigned,
				termsNotSet,
			}),
		});
	};
};
