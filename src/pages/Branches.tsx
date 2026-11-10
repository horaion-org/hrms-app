import { formattingLocale } from "@/common/formattingLocale";
import { useMemo, useState } from "react";
import { mapRefusal } from "@/common/refusal";
import { useAccess } from "@/features/workspace/useAccess";
import { branchScope, COMPANY_SCOPE } from "@/features/workspace/scopes";
import { CreateBranchDialog } from "@/features/organisation/CreateBranchDialog";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
	DataTable,
	type DataTableColumn,
	type DataTableSort,
} from "@/components/ui/DataTable";
import type { Branch } from "@/features/organisation/api";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	describeList,
	isStatusFilter,
	matchesSearch,
	statusFilterChips,
	statusFilterOptions,
	type StatusFilter,
} from "@/features/organisation/listColumns";
import { branchColumns } from "@/features/organisation/branchColumns";
import { useSetBranchStatus } from "@/features/organisation/useChangeListRow";
import { useBranches } from "@/features/organisation/useOrganisationList";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";

export const Branches = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const access = useAccess();
	const { t, i18n } = useTranslation();
	// Dates follow the browser's region of the app's language (en-GB: day first).
	const locale = formattingLocale(i18n);
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
		(): Array<DataTableColumn<Branch>> =>
			branchColumns(t, {
				language: i18n.language,
				locale,
				// Editing a Branch is granted at that Branch, or company-wide.
				canUpdate: (branch) =>
					access.can("branch:update", branchScope(branch.branchId)),
				onEdit: setEditing,
				onChangeStatus: setChanging,
			}),
		[t, i18n.language, locale, access]
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
				chips={statusFilterChips(t, status, () => {
					setStatus("all");
				})}
				filter={{
					label: t("organisation.list.showing"),
					value: status,
					options: statusFilterOptions(t, t("organisation.branches.all")),
					onChange: (value) => {
						if (isStatusFilter(value)) setStatus(value);
					},
				}}
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
