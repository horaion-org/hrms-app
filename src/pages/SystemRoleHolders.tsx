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
import {
	fetchBranches,
	fetchDepartmentUnits,
	type AccessRole,
} from "@/features/organisation/api";
import { AssignAccessRoleDialog } from "@/features/organisation/AssignAccessRoleDialog";
import {
	assignmentRefusal,
	assignmentStatusRefusal,
} from "@/features/organisation/assignmentRefusal";
import {
	assignmentTargets,
	placeKey,
	placeOf,
} from "@/features/organisation/assignmentTargets";
import { PermissionSummary } from "@/features/organisation/PermissionSummary";
import { useChangeAccessRoleHolders } from "@/features/organisation/useAccessRoleHolders";
import { useCompanyMemberSearch } from "@/features/organisation/useCompanyMemberSearch";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { isPermissionKey } from "@/features/workspace/permissionKeys";
import { useCan } from "@/features/workspace/useCan";

const key = "organisation.accessRoles.assignments";
const ACTIVE_BY_NAME = {
	sort: { field: "name", desc: false },
	status: "ACTIVE",
} as const;

/**
 * The assign dialog with its people search and the places a role can apply;
 * mounted only while open. Given one role, that role is assigned; given
 * several, the person chooses. Given `editing`, it changes where that person
 * already has the role: places newly chosen are granted and places cleared
 * are removed.
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
	const [query, setQuery] = useState("");
	const people = useCompanyMemberSearch(companyId, query);
	const branches = useQuery({
		queryKey: ["organisation", companyId, "branches", ACTIVE_BY_NAME],
		queryFn: () => fetchBranches(companyId, ACTIVE_BY_NAME),
	});
	const departments = useQuery({
		queryKey: ["organisation", companyId, "department-units"],
		queryFn: () => fetchDepartmentUnits(companyId),
	});
	const change = useChangeAccessRoleHolders(companyId);
	const held = editing?.places ?? [];

	return (
		<AssignAccessRoleDialog
			error={change.error ? assignmentRefusal(change.error, t) : undefined}
			people={people.data?.items ?? []}
			query={query}
			roles={roles}
			submitting={change.isPending}
			editing={
				editing && {
					person: {
						membershipId: editing.membershipId,
						displayName: editing.name,
						status: editing.status,
					},
					places: held.map((place) => ({
						label: placeOf(place, t),
						branchId: place.branchId,
						departmentId: place.departmentId,
					})),
				}
			}
			targets={assignmentTargets(
				branches.data?.items ?? [],
				departments.data?.items ?? [],
				t
			)}
			onClose={onClose}
			onQueryChange={setQuery}
			onAssign={(accessRoleId, companyMembershipId, targets) => {
				const chosen = new Set(targets.map(placeKey));
				const already = new Set(held.map(placeKey));
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
						revokes: held
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
	const can = useCan();
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
	// Choosing a person or a place needs the company's list of people.
	const canChange =
		!role.protectedRole &&
		can("access_role:assign") &&
		can("company_member:read");
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
				className="mt-8"
				onEdit={canChange ? setEditing : undefined}
				onRemove={canChange ? setRemoving : undefined}
				onSetStatus={canChange ? setSwitching : undefined}
				onAssign={
					// An inactive role isn't newly assigned.
					canChange && active
						? (): void => {
								setAssigning(true);
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
					error={change.isError ? t(`${key}.removeFailed`) : undefined}
					submitting={change.isPending}
					title={t(`${key}.remove.title`, { name: removing.name })}
					description={t(`${key}.remove.description`, {
						name: removing.name,
						role: role.name,
					})}
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
