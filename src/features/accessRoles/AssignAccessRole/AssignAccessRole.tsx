import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { placeLabels } from "@/features/accessRoles/accessSummary";
import type { AccessRolePerson } from "@/features/accessRoles/AccessRoleAssignments";
import type { AccessRole } from "@/features/organisation/api";
import { AssignAccessRoleDialog } from "@/features/accessRoles/AssignAccessRoleDialog";
import { assignmentRefusal } from "@/features/accessRoles/assignmentRefusal";
import {
	assignmentTargets,
	changeableAt,
} from "@/features/accessRoles/assignmentTargets";
import { placeKey, placeOf } from "@/features/workspace/places";
import {
	useAccessRoleHolders,
	useChangeAccessRoleHolders,
} from "@/features/accessRoles/useAccessRoleHolders";
import { useCompanyMemberSearch } from "@/features/organisation/useCompanyMemberSearch";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useMemberRoles } from "@/features/accessRoles/useMemberRoles";
import { workspaceQuery } from "@/features/workspace/api";
import { retry } from "@/features/workspace/retry";
import { useAccess } from "@/features/workspace/useAccess";

export type AssignAccessRoleProps = {
	/** One role to assign, or several for the person to choose from. */
	roles: Array<AccessRole>;
	/** A person who already has the one role in `roles`, to change where. */
	editing?: AccessRolePerson;
	onClose: () => void;
};

/**
 * The assign dialog with its people search and the places a role can apply;
 * mounted only while open. Given one role, that role is assigned; given
 * several, the person chooses. Recipients come from the colleagues directory
 * (any active company member, whatever their Branch or Department); places
 * come from the workspace, only where the person holds `access_role:assign`.
 * Given `editing`, it changes where that person already has the role,
 * starting from their current assignments as last loaded: places newly
 * chosen are granted, places cleared are removed, and places the person may
 * not change are shown but never touched. Once a person is chosen, what
 * they hold at the places the reader can see is loaded to preview their
 * access after the change.
 */
export const AssignAccessRole = ({
	roles,
	editing,
	onClose,
}: AssignAccessRoleProps): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const access = useAccess();
	const [query, setQuery] = useState("");
	const [recipient, setRecipient] = useState(editing?.membershipId ?? "");
	const held = useMemberRoles(companyId, recipient);
	const people = useCompanyMemberSearch(companyId, query);
	const { data: workspace } = useQuery({ ...workspaceQuery, retry });
	const change = useChangeAccessRoleHolders(companyId);
	const onlyRole = roles.length === 1 ? roles[0] : undefined;
	// The live rows, so a retry after a partial failure starts from where things now stand.
	const holders = useAccessRoleHolders(
		companyId,
		editing && onlyRole ? onlyRole.accessRoleId : ""
	);
	const current = editing
		? (holders.data?.filter(
				(row) => row.membershipId === editing.membershipId
			) ?? editing.places)
		: [];
	const changeable = current.filter(changeableAt(access.can));
	const fixed = current.filter((place) => !changeableAt(access.can)(place));
	const preview =
		held.status === "ready"
			? {
					assignments: held.assignments,
					roles: held.accessRoles,
					placeLabel: placeLabels(workspace, companyId, t),
				}
			: undefined;

	return (
		<AssignAccessRoleDialog
			error={change.error ? assignmentRefusal(change.error, t) : undefined}
			people={people.data?.items ?? []}
			preview={preview}
			query={query}
			roles={roles}
			submitting={change.isPending}
			targets={assignmentTargets(workspace, companyId, access.can, t)}
			editing={
				editing && {
					person: {
						membershipId: editing.membershipId,
						displayName: editing.name,
						status: editing.status,
					},
					places: changeable.map((place) => ({
						label: placeOf(place, t),
						branchId: place.branchId,
						departmentId: place.departmentId,
					})),
					fixedPlaces: fixed.map((place) => placeOf(place, t)),
				}
			}
			onClose={onClose}
			onQueryChange={setQuery}
			onAssign={(accessRoleId, companyMembershipId, targets) => {
				const chosen = new Set(targets.map(placeKey));
				const already = new Set(changeable.map(placeKey));
				change.mutate(
					{
						grants: targets
							.filter((target) => !already.has(placeKey(target)))
							.map((target) => ({
								companyMembershipId,
								accessRoleId,
								branchId: target.branchId,
								departmentId: target.departmentId,
							})),
						revokes: changeable
							.filter((place) => !chosen.has(placeKey(place)))
							.map((place) => place.assignmentId),
					},
					{ onSuccess: onClose }
				);
			}}
			onPersonChange={(person) => {
				setRecipient(person?.membershipId ?? "");
			}}
		/>
	);
};
