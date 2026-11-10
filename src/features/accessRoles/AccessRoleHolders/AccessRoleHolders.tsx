import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AssignAccessRole } from "@/features/accessRoles/AssignAccessRole";
import {
	AccessRoleAssignments,
	type AccessRoleAssignmentRow,
	type AccessRolePerson,
} from "@/features/organisation/AccessRoleAssignments";
import type { AccessRole, UnitStatus } from "@/features/organisation/api";
import {
	assignmentRemoveRefusal,
	assignmentStatusRefusal,
} from "@/features/organisation/assignmentRefusal";
import { changeableAt } from "@/features/organisation/assignmentTargets";
import { PermissionSummary } from "@/features/organisation/PermissionSummary";
import { useChangeAccessRoleHolders } from "@/features/organisation/useAccessRoleHolders";
import { isPermissionKey } from "@/features/workspace/permissionKeys";
import type { CanAt } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";

const key = "organisation.accessRoles.assignments";

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

export type AccessRoleHoldersProps = {
	role: AccessRole;
	/** Who holds the role and where; `undefined` when the list couldn't be loaded. */
	holders: Array<AccessRoleAssignmentRow> | undefined;
};

/**
 * What an access role allows, then who has it and where, with assigning,
 * editing and removing for those who may. The Company Owner role is listed
 * but never assigned or changed here: ownership moves only through its own
 * transfer.
 */
export const AccessRoleHolders = ({
	role,
	holders,
}: AccessRoleHoldersProps): FunctionComponent => {
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
				<AssignAccessRole
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
