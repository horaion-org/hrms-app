import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useId, useMemo, useState } from "react";
import { COMPANY_SCOPE, effectiveAt } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import {
	DataTable,
	type DataTableColumn,
	type DataTableSort,
} from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ArrowLeftIcon } from "@/components/ui/Icon";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import { mayAssignRole } from "@/features/organisation/accessRoleReadOnly";
import { placeLabels } from "@/features/organisation/accessSummary";
import type {
	AccessRole,
	DefaultAccessRule,
} from "@/features/organisation/api";
import { CreateSystemRoleDialog } from "@/features/organisation/CreateSystemRoleDialog";
import {
	defaultRuleText,
	type DefaultRuleText,
} from "@/features/organisation/defaultAccess";
import { assignmentTargets } from "@/features/organisation/assignmentTargets";
import { defaultAccessColumns } from "@/features/organisation/defaultAccessColumns";
import { DefaultAccessDialog } from "@/features/organisation/DefaultAccessDialog";
import { defaultAccessRefusal } from "@/features/organisation/defaultAccessRefusal";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	actionsColumn,
	describeList,
	isStatusFilter,
	nameColumn,
	statusColumn,
	statusFilterChips,
	statusFilterOptions,
	type StatusFilter,
} from "@/features/organisation/listColumns";
import {
	defaultAccessRulesQuery,
	useAddDefaultAccessRule,
	useRemoveDefaultAccessRule,
} from "@/features/organisation/useDefaultAccess";
import { useAccessRoles } from "@/features/organisation/useOrganisationList";
import { roleSummaryText } from "@/features/organisation/sectionLevels";
import { workspaceQuery } from "@/features/workspace/api";
import { isPermissionKey } from "@/features/workspace/permissionKeys";
import { retry } from "@/features/workspace/retry";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import {
	SystemRoleActionDialog,
	type SystemRoleAction,
} from "@/pages/SystemRoleActions";
import { AssignSystemRole } from "@/pages/SystemRoleHolders";

/** Every role, whatever the list's filter, to name the role each default gives. */
const ALL_ROLES_BY_NAME = { sort: { field: "name", desc: false } } as const;

/**
 * Access roles: who may manage what, and where (Settings › Access roles),
 * then the defaults everyone who receives default access gets (API
 * ADR-0118), read with `access_role:read` and removed with
 * `access_role:assign`, both at the whole company.
 */
export const SystemRoles = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const [creating, setCreating] = useState(false);
	const access = useAccess();
	// Role definitions are shared by the whole company: changing them is company authority.
	const canCreate = access.can("access_role:create", COMPANY_SCOPE);
	// The API's subset rule compares a role with what the person holds company-wide.
	const permissions = effectiveAt(access.index, COMPANY_SCOPE);
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
	// The System Owner and System Admin roles are never edited; any other needs the update key.
	const canEdit = useCallback(
		(role: AccessRole): boolean =>
			!role.protectedRole && access.can("access_role:update", COMPANY_SCOPE),
		[access]
	);
	const navigate = useNavigate();
	const defaultsHeadingId = useId();
	const canReadDefaults = access.can("access_role:read", COMPANY_SCOPE);
	// Only the System Owner and System Admin hold it (API ADR-0108).
	const canChangeDefaults = access.can("access_role:assign", COMPANY_SCOPE);
	const defaults = useQuery(
		defaultAccessRulesQuery(companyId, canReadDefaults)
	);
	const allRoles = useAccessRoles(companyId, ALL_ROLES_BY_NAME);
	const { data: workspace } = useQuery({ ...workspaceQuery, retry });
	const [removing, setRemoving] = useState<DefaultAccessRule>();
	const remove = useRemoveDefaultAccessRule(companyId);
	const [addingDefault, setAddingDefault] = useState(false);
	const add = useAddDefaultAccessRule(companyId);
	const describeDefault = (rule: DefaultAccessRule): DefaultRuleText =>
		defaultRuleText(
			rule,
			allRoles.status === "ready" ? allRoles.items : [],
			placeLabels(workspace, companyId, t),
			t
		);
	const defaultsColumns = defaultAccessColumns(t, {
		describe: describeDefault,
		onRemove: canChangeDefaults ? setRemoving : undefined,
	});
	// Opens the role on its permissions, which are read-only for a role the person can't change.
	const open = useCallback(
		(role: AccessRole): void => {
			void navigate({
				to: "/settings/access-roles/$accessRoleId",
				params: { accessRoleId: role.accessRoleId },
				search: { tab: "permissions" },
			});
		},
		[navigate]
	);
	const [assigning, setAssigning] = useState(false);
	const [action, setAction] = useState<SystemRoleAction>();
	// Only roles the person may give, never the System Owner role or an inactive one (API ADR-0108).
	const assignable =
		// Assigning happens at a place; the dialog offers only places where it is held.
		list.status === "ready"
			? list.items.filter(
					(role) => role.status === "ACTIVE" && mayAssignRole(role, access)
				)
			: [];
	const columns = useMemo(
		// What it allows is the one flexible column, so a role's summary fits in a line or two;
		// the others are sized to their content.
		(): Array<DataTableColumn<AccessRole>> => [
			{
				...nameColumn<AccessRole>(t("organisation.accessRoles.name")),
				headerClassName: "w-40",
			},
			{
				// Where the role can be used: its kind, in the words of the editor's question.
				id: "kind",
				header: t("organisation.accessRoles.where"),
				cell: (role) => t(`organisation.accessRoles.whereLabels.${role.kind}`),
				headerClassName: "w-32",
				hideBelow: "md",
			},
			{
				id: "permissions",
				header: t("organisation.accessRoles.permissions"),
				// What the role allows, section by section; the built-in roles hold everything.
				cell: (role) =>
					role.protectedRole
						? t("organisation.accessRoles.fullAccess")
						: roleSummaryText(role.permissions.filter(isPermissionKey), t) ||
							t("organisation.permissions.none"),
				hideBelow: "md",
			},
			{
				id: "people",
				header: t("organisation.accessRoles.people"),
				// Opens the role on who has it and where.
				cell: (role) => (
					<Button
						params={{ accessRoleId: role.accessRoleId }}
						to="/settings/access-roles/$accessRoleId"
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
				// On a phone the link joins the name's line: one tap to the role, as here.
				headerClassName: "w-24",
				hideBelow: "md",
			},
			// Phones keep the role and the actions; Status joins from `sm`, as on the other lists.
			{
				...statusColumn<AccessRole>(t),
				headerClassName: "w-28",
				hideBelow: "sm",
			},
			{
				...actionsColumn<AccessRole>(
					t,
					(role) => (
						<>
							<OverflowMenuItem
								onClick={() => {
									void navigate({
										to: "/settings/access-roles/$accessRoleId",
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
									!access.can("access_role:delete", COMPANY_SCOPE)
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
				// Two icon buttons: narrower than the shared default.
				headerClassName: "w-24",
			},
		],
		[t, access, canCreate, canEdit, navigate, open]
	);

	return (
		<>
			{/* Access roles open from Settings' list, so the way back leads there. */}
			<Button leadingIcon={<ArrowLeftIcon />} to="/settings" variant="textlink">
				{t("settings.back")}
			</Button>
			<h1 className="mt-4 text-4xl font-medium text-neutral-900">
				{t("organisation.accessRoles.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("organisation.accessRoles.subtitle")}
			</p>
			<Callout className="mt-6">
				{t("organisation.accessRoles.baseline")}
			</Callout>
			<ListToolbar
				className="mt-10"
				createLabel={t("organisation.accessRoles.create")}
				search={search}
				searchLabel={t("organisation.accessRoles.search")}
				chips={statusFilterChips(t, status, () => {
					setStatus("all");
				})}
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
				onClearFilters={() => {
					setStatus("all");
				}}
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
			{canReadDefaults && (
				<section aria-labelledby={defaultsHeadingId} className="mt-12">
					<h2
						className="text-xl font-semibold text-neutral-900"
						id={defaultsHeadingId}
					>
						{t("organisation.accessRoles.defaults.title")}
					</h2>
					<p className="mt-3 text-sm text-neutral-800">
						{t("organisation.accessRoles.defaults.description")}
					</p>
					{canChangeDefaults && (
						<div className="mt-6 flex flex-wrap gap-3">
							<Button
								variant="secondary"
								onClick={() => {
									setAddingDefault(true);
								}}
							>
								{t("organisation.accessRoles.defaults.add")}
							</Button>
						</div>
					)}
					{defaults.isError ? (
						<p className="mt-6 text-sm text-error-700" role="alert">
							{t("organisation.accessRoles.defaults.loadFailed")}
						</p>
					) : (
						<DataTable
							className="mt-6"
							columns={defaultsColumns}
							data={defaults.data ?? []}
							getRowId={(rule) => rule.defaultAccessRuleId}
							label={t("organisation.accessRoles.defaults.title")}
							emptyState={
								defaults.isPending
									? t("organisation.list.loading")
									: t("organisation.accessRoles.defaults.empty")
							}
						/>
					)}
				</section>
			)}
			{addingDefault && (
				<DefaultAccessDialog
					error={add.error ? defaultAccessRefusal(add.error, t) : undefined}
					places={assignmentTargets(workspace, companyId, access.can, t)}
					roles={allRoles.status === "ready" ? allRoles.items : []}
					submitting={add.isPending}
					onAdd={(body) => {
						add.mutate(body, {
							onSuccess: () => {
								setAddingDefault(false);
							},
						});
					}}
					onClose={() => {
						add.reset();
						setAddingDefault(false);
					}}
				/>
			)}
			{removing && (
				<ConfirmDialog
					cancelLabel={t("organisation.list.cancel")}
					confirmLabel={t("organisation.accessRoles.defaults.remove.confirm")}
					submitting={remove.isPending}
					tone="danger"
					description={t(
						"organisation.accessRoles.defaults.remove.description"
					)}
					error={
						remove.error ? defaultAccessRefusal(remove.error, t) : undefined
					}
					title={t("organisation.accessRoles.defaults.remove.title", {
						role: describeDefault(removing).role,
						setFor: describeDefault(removing).setFor,
					})}
					onClose={() => {
						remove.reset();
						setRemoving(undefined);
					}}
					onConfirm={() => {
						remove.mutate(removing.defaultAccessRuleId, {
							onSuccess: () => {
								setRemoving(undefined);
							},
						});
					}}
				/>
			)}
		</>
	);
};
