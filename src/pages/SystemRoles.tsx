import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useCan } from "@/features/workspace/useCan";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import {
	DataTable,
	type DataTableColumn,
	type DataTableSort,
} from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { AccessRole } from "@/features/organisation/api";
import { CreateSystemRoleDialog } from "@/features/organisation/CreateSystemRoleDialog";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	actionsColumn,
	describeList,
	isStatusFilter,
	nameColumn,
	statusColumn,
	statusFilterOptions,
	type StatusFilter,
} from "@/features/organisation/listColumns";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useAccessRoles } from "@/features/organisation/useOrganisationList";
import {
	SystemRoleActionDialog,
	type SystemRoleAction,
} from "@/pages/SystemRoleActions";
import { AssignSystemRole } from "@/pages/SystemRoleHolders";
import { companyPermissions, workspaceQuery } from "@/features/workspace/api";

/** Access roles, shown as "System roles". */
export const SystemRoles = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const [creating, setCreating] = useState(false);
	const workspace = useQuery(workspaceQuery);
	const permissions = useMemo(
		() =>
			workspace.data
				? companyPermissions(workspace.data, companyId)
				: new Set<string>(),
		[workspace.data, companyId]
	);
	const canCreate = permissions.has("access_role:create");
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [sort, setSort] = useState<DataTableSort>({ id: "name", desc: false });
	const list = useAccessRoles(companyId, {
		sort: { field: sort.id, desc: sort.desc },
		status: status === "all" ? undefined : status,
	});
	const view = describeList(
		list,
		search,
		status !== "all",
		t("organisation.accessRoles.empty"),
		t
	);
	const can = useCan();
	// The Company Owner role is never edited; any other needs the update key.
	const canEdit = useCallback(
		(role: AccessRole): boolean =>
			!role.protectedRole && can("access_role:update"),
		[can]
	);
	const navigate = useNavigate();
	// Opens the role on its permissions, which are read-only for a role the person can't change.
	const open = useCallback(
		(role: AccessRole): void => {
			void navigate({
				to: "/organisation/system-roles/$accessRoleId",
				params: { accessRoleId: role.accessRoleId },
				search: { tab: "permissions" },
			});
		},
		[navigate]
	);
	const [assigning, setAssigning] = useState(false);
	const [action, setAction] = useState<SystemRoleAction>();
	// Neither the Company Owner role nor an inactive role is assigned here; choosing a person needs the company's list of people.
	const assignable =
		list.status === "ready" &&
		can("access_role:assign") &&
		can("company_member:read")
			? list.items.filter(
					(role) => !role.protectedRole && role.status === "ACTIVE"
				)
			: [];
	const columns = useMemo(
		(): Array<DataTableColumn<AccessRole>> => [
			nameColumn<AccessRole>(t("organisation.accessRoles.name")),
			{
				id: "permissions",
				header: t("organisation.accessRoles.permissions"),
				cell: (role) =>
					role.protectedRole
						? t("organisation.accessRoles.fullAccess")
						: t("organisation.accessRoles.permissionCount", {
								count: role.permissions.length,
							}),
			},
			{
				id: "people",
				header: t("organisation.accessRoles.people"),
				// Opens the role on who has it and where.
				cell: (role) => (
					<Button
						params={{ accessRoleId: role.accessRoleId }}
						to="/organisation/system-roles/$accessRoleId"
						variant="textlink"
						aria-label={t("organisation.accessRoles.viewPeople", {
							count: role.holderCount,
							name: role.name,
						})}
					>
						{t("organisation.accessRoles.peopleCount", {
							count: role.holderCount,
						})}
					</Button>
				),
			},
			statusColumn<AccessRole>(t),
			actionsColumn<AccessRole>(
				t,
				(role) => (
					<>
						<OverflowMenuItem
							onClick={() => {
								void navigate({
									to: "/organisation/system-roles/$accessRoleId",
									params: { accessRoleId: role.accessRoleId },
								});
							}}
						>
							{t("organisation.list.viewItem")}
						</OverflowMenuItem>
						<OverflowMenuItem
							disabled={!canCreate}
							onClick={() => {
								setAction({ kind: "duplicate", role });
							}}
						>
							{t("organisation.list.duplicateItem")}
						</OverflowMenuItem>
						<OverflowMenuItem
							disabled={!canEdit(role)}
							onClick={() => {
								setAction({ kind: "status", role });
							}}
						>
							{t(
								role.status === "ACTIVE"
									? "organisation.list.deactivateItem"
									: "organisation.list.activateItem"
							)}
						</OverflowMenuItem>
						<OverflowMenuItem
							// Only a role nobody holds can be deleted.
							disabled={
								role.protectedRole ||
								role.holderCount > 0 ||
								!can("access_role:delete")
							}
							onClick={() => {
								setAction({ kind: "delete", role });
							}}
						>
							{t("organisation.list.deleteItem")}
						</OverflowMenuItem>
					</>
				),
				canEdit,
				open
			),
		],
		[t, can, canCreate, canEdit, navigate, open]
	);

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("organisation.accessRoles.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("organisation.accessRoles.subtitle")}
			</p>
			<ListToolbar
				className="mt-10"
				createLabel={t("organisation.accessRoles.create")}
				search={search}
				searchLabel={t("organisation.accessRoles.search")}
				filter={{
					label: t("organisation.list.showing"),
					value: status,
					options: statusFilterOptions(t, t("organisation.accessRoles.all")),
					onChange: (value) => {
						if (isStatusFilter(value)) setStatus(value);
					},
				}}
				secondaryAction={
					assignable.length > 0
						? {
								label: t("organisation.accessRoles.assign"),
								onClick: (): void => {
									setAssigning(true);
								},
							}
						: undefined
				}
				onSearchChange={setSearch}
				onCreate={
					canCreate
						? (): void => {
								setCreating(true);
							}
						: undefined
				}
			/>
			{assigning && (
				<AssignSystemRole
					roles={assignable}
					onClose={() => {
						setAssigning(false);
					}}
				/>
			)}
			{action && (
				<SystemRoleActionDialog
					// A fresh dialog for each row and action.
					key={`${action.kind}-${action.role.accessRoleId}`}
					action={action}
					heldPermissions={permissions}
					onClose={() => {
						setAction(undefined);
					}}
				/>
			)}
			{creating && canCreate && (
				<CreateSystemRoleDialog
					key={companyId}
					companyId={companyId}
					heldPermissions={permissions}
					onClose={() => {
						setCreating(false);
					}}
				/>
			)}
			{view.problem ? (
				<p
					className="mt-8 text-sm text-neutral-700 data-alert:text-error-700"
					data-alert={view.problem.alert || undefined}
					role={view.problem.alert ? "alert" : undefined}
				>
					{view.problem.message}
				</p>
			) : (
				<>
					<DataTable
						manualSorting
						className="mt-8"
						columns={columns}
						data={view.rows}
						emptyState={view.empty}
						getRowId={(role) => role.accessRoleId}
						label={t("organisation.accessRoles.label")}
						selection={{ rowLabel: (role) => role.name }}
						sort={sort}
						onSortChange={setSort}
					/>
					{view.truncated && (
						<p className="mt-4 text-sm text-neutral-700">{view.truncated}</p>
					)}
				</>
			)}
		</>
	);
};
