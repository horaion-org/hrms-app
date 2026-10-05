import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { AccessRoleAssignments } from "@/features/organisation/AccessRoleAssignments";
import {
	fetchBranches,
	fetchDepartmentUnits,
	type AccessRole,
	type AccessRoleHolder,
} from "@/features/organisation/api";
import { AssignAccessRoleDialog } from "@/features/organisation/AssignAccessRoleDialog";
import { assignmentRefusal } from "@/features/organisation/assignmentRefusal";
import { assignmentTargets } from "@/features/organisation/assignmentTargets";
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
 * several, the person chooses.
 */
export const AssignSystemRole = ({
	roles,
	onClose,
}: {
	roles: Array<AccessRole>;
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
	const { assign } = useChangeAccessRoleHolders(companyId);

	return (
		<AssignAccessRoleDialog
			error={assign.error ? assignmentRefusal(assign.error, t) : undefined}
			people={people.data?.items ?? []}
			query={query}
			roles={roles}
			submitting={assign.isPending}
			targets={assignmentTargets(
				branches.data?.items ?? [],
				departments.data?.items ?? [],
				t
			)}
			onClose={onClose}
			onQueryChange={setQuery}
			onAssign={(accessRoleId, companyMembershipId, targets) => {
				assign.mutate(
					targets.map((target) => ({
						companyMembershipId,
						accessRoleId,
						branchId: target.branchId,
						departmentId: target.departmentId,
					})),
					{ onSuccess: onClose }
				);
			}}
		/>
	);
};

export type SystemRoleHoldersProps = {
	role: AccessRole;
	/** Who holds the role and where; `undefined` when the list couldn't be loaded. */
	holders: Array<AccessRoleHolder> | undefined;
};

/**
 * What a system role allows, then who has it and where, with assigning and
 * removing for those who may. The Company Owner role is listed but never
 * assigned or removed here: ownership moves only through its own transfer.
 */
export const SystemRoleHolders = ({
	role,
	holders,
}: SystemRoleHoldersProps): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const can = useCan();
	const { t } = useTranslation();
	const { revoke } = useChangeAccessRoleHolders(companyId);
	const [assigning, setAssigning] = useState(false);
	const canChange = !role.protectedRole && can("access_role:assign");
	const problem = holders
		? revoke.isError && t(`${key}.removeFailed`)
		: t(`${key}.loadFailed`);

	return (
		<>
			<PermissionSummary
				permissions={role.permissions.filter(isPermissionKey)}
				title={t(`${key}.allows`)}
			/>
			{problem && (
				<p className="mt-6 text-sm text-error-700" role="alert">
					{problem}
				</p>
			)}
			<AccessRoleAssignments
				className="mt-8"
				assignments={(holders ?? []).map((holder) => ({
					assignmentId: holder.accessRoleAssignmentId,
					membershipId: holder.companyMembershipId,
					displayName: holder.displayName,
					branchName: holder.branchName ?? undefined,
					departmentName: holder.departmentName ?? undefined,
				}))}
				onAssign={
					// Choosing a person needs the company's list of people.
					canChange && can("company_member:read")
						? (): void => {
								setAssigning(true);
							}
						: undefined
				}
				onRemove={
					canChange
						? (assignment): void => {
								revoke.mutate(assignment.assignmentId);
							}
						: undefined
				}
			/>
			{assigning && (
				<AssignSystemRole
					roles={[role]}
					onClose={() => {
						setAssigning(false);
					}}
				/>
			)}
		</>
	);
};
