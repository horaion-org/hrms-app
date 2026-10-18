import { countryName } from "@/common/countries";
import { useMemo, useState } from "react";
import { useAccess } from "@/features/workspace/useAccess";
import { branchScope, COMPANY_SCOPE } from "@/features/workspace/scopes";
import { CreateBranchDialog } from "@/features/organisation/CreateBranchDialog";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableSort } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { Branch } from "@/features/organisation/api";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	actionsColumn,
	describeList,
	isStatusFilter,
	matchesSearch,
	nameColumn,
	statusColumn,
	statusFilterOptions,
	type StatusFilter,
} from "@/features/organisation/listColumns";
import { mapRefusal } from "@/features/organisation/refusal";
import { useSetBranchStatus } from "@/features/organisation/useChangeListRow";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useBranches } from "@/features/organisation/useOrganisationList";

export const Branches = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const access = useAccess();
	const { t, i18n } = useTranslation();
	const [creating, setCreating] = useState(false);
	const [editing, setEditing] = useState<Branch>();
	// The Branch whose status the person asked to change, until they confirm or cancel.
	const [changing, setChanging] = useState<Branch>();
	const setBranchStatus = useSetBranchStatus(companyId);
	const statusKey = `organisation.branches.status.${
		changing?.status === "ACTIVE" ? "deactivate" : "activate"
	}` as const;
	const closeChange = (): void => {
		setBranchStatus.reset();
		setChanging(undefined);
	};
	// A Branch is created at the company.
	const canCreate = access.can("branch:create", COMPANY_SCOPE);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [sort, setSort] = useState<DataTableSort>({ id: "name", desc: false });
	const list = useBranches(companyId, {
		sort: { field: sort.id, desc: sort.desc },
		status: status === "all" ? undefined : status,
	});
	const view = describeList(
		list,
		search,
		status !== "all",
		t("organisation.branches.empty"),
		t,
		(branch, query) =>
			matchesSearch(branch.name, query) || matchesSearch(branch.code, query)
	);
	const columns = useMemo(
		() => [
			nameColumn<Branch>(t("organisation.branches.name")),
			{
				id: "code",
				header: t("organisation.branches.code"),
				cell: (branch: Branch): string => branch.code,
				sortValue: (branch: Branch): string => branch.code,
			},
			{
				id: "city",
				header: t("organisation.branches.city"),
				cell: (branch: Branch): string => branch.city,
				sortValue: (branch: Branch): string => branch.city,
			},
			{
				id: "country",
				header: t("organisation.branches.country"),
				cell: (branch: Branch): string =>
					countryName(branch.country, i18n.language),
			},
			statusColumn<Branch>(t),
			actionsColumn<Branch>(
				t,
				(branch) => (
					<>
						<OverflowMenuItem disabled>
							{t("organisation.list.viewItem")}
						</OverflowMenuItem>
						<OverflowMenuItem disabled>
							{t("organisation.list.duplicateItem")}
						</OverflowMenuItem>
						<OverflowMenuItem
							disabled={
								!access.can("branch:update", branchScope(branch.branchId))
							}
							onClick={() => {
								setChanging(branch);
							}}
						>
							{t(
								branch.status === "ACTIVE"
									? "organisation.list.deactivateItem"
									: "organisation.list.activateItem"
							)}
						</OverflowMenuItem>
					</>
				),
				// Editing a Branch is granted at that Branch, or company-wide.
				(branch) => access.can("branch:update", branchScope(branch.branchId)),
				setEditing
			),
		],
		[t, i18n.language, access]
	);

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("organisation.branches.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("organisation.branches.subtitle")}
			</p>
			<ListToolbar
				className="mt-10"
				createLabel={t("organisation.branches.create")}
				search={search}
				searchLabel={t("organisation.branches.search")}
				filter={{
					label: t("organisation.list.showing"),
					value: status,
					options: statusFilterOptions(t, t("organisation.branches.all")),
					onChange: (value) => {
						if (isStatusFilter(value)) setStatus(value);
					},
				}}
				onSearchChange={setSearch}
				onCreate={
					canCreate
						? (): void => {
								setCreating(true);
							}
						: undefined
				}
			/>
			{creating && canCreate && (
				<CreateBranchDialog
					key={companyId}
					companyId={companyId}
					onClose={() => {
						setCreating(false);
					}}
				/>
			)}
			{editing &&
				access.can("branch:update", branchScope(editing.branchId)) && (
					<CreateBranchDialog
						key={`${companyId}-${editing.branchId}`}
						companyId={companyId}
						editing={editing}
						onClose={() => {
							setEditing(undefined);
						}}
					/>
				)}
			{changing && (
				<ConfirmDialog
					cancelLabel={t("organisation.list.cancel")}
					confirmLabel={t(`${statusKey}Confirm`)}
					description={t(`${statusKey}Description`)}
					submitting={setBranchStatus.isPending}
					title={t(`${statusKey}Title`, { name: changing.name })}
					error={
						setBranchStatus.error
							? mapRefusal(setBranchStatus.error, {
									forbidden: t("organisation.branches.status.forbidden"),
									failed: t("organisation.branches.status.failed"),
								}).message
							: undefined
					}
					onClose={closeChange}
					onConfirm={() => {
						setBranchStatus.mutate(
							{
								row: changing,
								status: changing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
							},
							{ onSuccess: closeChange }
						);
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
						getRowId={(branch) => branch.branchId}
						label={t("organisation.branches.label")}
						selection={{ rowLabel: (branch) => branch.name }}
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
