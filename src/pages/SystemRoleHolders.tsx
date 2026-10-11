import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
	AccessRoleAssignments,
	type AccessRoleAssignmentRow,
	type AccessRolePerson,
} from "@/features/organisation/AccessRoleAssignments";
import type { AccessRole, UnitStatus } from "@/features/organisation/api";
import { AssignAccessRoleDialog } from "@/features/organisation/AssignAccessRoleDialog";
import {
	assignmentRefusal,
	assignmentRemoveRefusal,
	assignmentStatusRefusal,
} from "@/features/organisation/assignmentRefusal";
import {
	assignmentTargets,
	placeKey,
	placeOf,
	scopeOfPlace,
} from "@/features/organisation/assignmentTargets";
import { PermissionSummary } from "@/features/organisation/PermissionSummary";
import {
	useAccessRoleHolders,
	useChangeAccessRoleHolders,
} from "@/features/organisation/useAccessRoleHolders";
import { useCompanyMemberSearch } from "@/features/organisation/useCompanyMemberSearch";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { workspaceQuery } from "@/features/workspace/api";
import { isPermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import type { CanAt } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

const key = "organisation.accessRoles.assignments";

/** Whether the person may change one assignment: `access_role:assign` at the assignment's own place. */
const changeableAt =
	(can: CanAt) =>
	(place: AccessRoleAssignmentRow): boolean =>
		can("access_role:assign", scopeOfPlace(place));

/**
 * A person's row narrowed to the assignments the person may change, with
 * the status those alone add up to. Status and removal act on these only:
 * an assignment out of reach is never touched because it is grouped on the
 * same row.
 */
const changeablePart = (
	person: AccessRolePerson,
	can: CanAt
): AccessRolePerson => {
	const places = person.places.filter(changeableAt(can));
	const status: UnitStatus = places.some((place) => place.status === "ACTIVE")
		? "ACTIVE"
		: "INACTIVE";
	return { ...person, places, status };
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
 * not change are shown but never touched.
 */
export const AssignSystemRole = ({
	roles,
	editing,
	onClose,
}: {
	roles: Array<AccessRole>;
	editing?: AccessRolePerson;
	onClose: () => void;
}): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const access = useAccess();
	const [query, setQuery] = useState("");
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

	return (
		<AssignAccessRoleDialog
			error={change.error ? assignmentRefusal(change.error, t) : undefined}
			people={people.data?.items ?? []}
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
		/>
	);
};

export type SystemRoleHoldersProps = {
	role: AccessRole;
	/** Who holds the role and where; `undefined` when the list couldn't be loaded. */
	holders: Array<AccessRoleAssignmentRow> | undefined;
};

/**
 * What a system role allows, then who has it and where, with assigning,
 * editing and removing for those who may. The Company Owner role is listed
 * but never assigned or changed here: ownership moves only through its own
 * transfer.
 */
export const SystemRoleHolders = ({
	role,
	holders,
}: SystemRoleHoldersProps): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const access = useAccess();
	const { t } = useTranslation();
	const change = useChangeAccessRoleHolders(companyId);
	const [assigning, setAssigning] = useState(false);
	const [editing, setEditing] = useState<AccessRolePerson>();
	const [removing, setRemoving] = useState<AccessRolePerson>();
	const [switching, setSwitching] = useState<AccessRolePerson>();
	const switchKey = `${key}.status.${
		switching?.status === "ACTIVE" ? "deactivate" : "activate"
	}` as const;
	const active = role.status === "ACTIVE";
	// Assignment changes are checked per assignment, at its own place; the Owner role never changes here.
	const canManage = !role.protectedRole;
	const canChangePerson = (person: AccessRolePerson): boolean =>
		canManage && person.places.some(changeableAt(access.can));
	const canAssign = canManage && access.canAnywhere("access_role:assign");
	const closeConfirm = (): void => {
		change.reset();
		setRemoving(undefined);
		setSwitching(undefined);
	};

	return (
		<>
			<PermissionSummary
				permissions={role.permissions.filter(isPermissionKey)}
				title={t(`${key}.allows`)}
			/>
			{!active && (
				<p className="mt-6 text-sm font-semibold text-neutral-900">
					{t(`${key}.inactive`)}
				</p>
			)}
			{!holders && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{t(`${key}.loadFailed`)}
				</p>
			)}
			<AccessRoleAssignments
				assignments={holders ?? []}
				canChange={canChangePerson}
				className="mt-8"
				onEdit={canManage ? setEditing : undefined}
				onAssign={
					// An inactive role isn't newly assigned.
					canAssign && active
						? (): void => {
								setAssigning(true);
							}
						: undefined
				}
				onRemove={
					canManage
						? (person): void => {
								setRemoving(changeablePart(person, access.can));
							}
						: undefined
				}
				onSetStatus={
					canManage
						? (person): void => {
								setSwitching(changeablePart(person, access.can));
							}
						: undefined
				}
			/>
			{(assigning || editing) && (
				<AssignSystemRole
					editing={editing}
					roles={[role]}
					onClose={() => {
						setAssigning(false);
						setEditing(undefined);
					}}
				/>
			)}
			{switching && (
				<ConfirmDialog
					cancelLabel={t("organisation.list.cancel")}
					confirmLabel={t(`${switchKey}Confirm`, { name: switching.name })}
					submitting={change.isPending}
					title={t(`${switchKey}Title`, { name: switching.name })}
					description={t(`${switchKey}Description`, {
						name: switching.name,
						role: role.name,
					})}
					error={
						change.error ? assignmentStatusRefusal(change.error, t) : undefined
					}
					onClose={closeConfirm}
					onConfirm={() => {
						change.mutate(
							{
								statuses: {
									assignmentIds: switching.places.map(
										(place) => place.assignmentId
									),
									status: switching.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
								},
							},
							{ onSuccess: closeConfirm }
						);
					}}
				/>
			)}
			{removing && (
				<ConfirmDialog
					cancelLabel={t("organisation.list.cancel")}
					confirmLabel={t(`${key}.remove.confirm`)}
					submitting={change.isPending}
					title={t(`${key}.remove.title`, { name: removing.name })}
					description={t(`${key}.remove.description`, {
						name: removing.name,
						role: role.name,
					})}
					error={
						change.error ? assignmentRemoveRefusal(change.error, t) : undefined
					}
					onClose={closeConfirm}
					onConfirm={() => {
						change.mutate(
							{ revokes: removing.places.map((place) => place.assignmentId) },
							{ onSuccess: closeConfirm }
						);
					}}
				/>
			)}
		</>
	);
};
