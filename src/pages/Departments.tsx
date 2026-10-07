import { useMemo, useState } from "react";
import { useCan, useCanAnywhere } from "@/features/workspace/useCan";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableSort } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { Department } from "@/features/organisation/api";
import { CreateDepartmentDialog } from "@/features/organisation/CreateDepartmentDialog";
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
import { mapRefusal } from "@/features/organisation/refusal";
import { useSetDepartmentStatus } from "@/features/organisation/useChangeListRow";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useDepartments } from "@/features/organisation/useOrganisationList";

export const Departments = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const [creating, setCreating] = useState(false);
	// The Department whose status the person asked to change, until they confirm or cancel.
	const [changing, setChanging] = useState<Department>();
	const setDepartmentStatus = useSetDepartmentStatus(companyId);
	const statusKey = `organisation.departments.status.${
		changing?.status === "ACTIVE" ? "deactivate" : "activate"
	}` as const;
	const closeChange = (): void => {
		setDepartmentStatus.reset();
		setChanging(undefined);
	};
	const can = useCan();
	const canAnywhere = useCanAnywhere();
	// Creating happens at a Branch the person may create in, so the branch picker needs the Branches.
	const canCreate =
		canAnywhere(["department:create"]) && canAnywhere(["branch:read"]);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [sort, setSort] = useState<DataTableSort>({ id: "name", desc: false });
	const list = useDepartments(companyId, {
		sort: { field: sort.id, desc: sort.desc },
		status: status === "all" ? undefined : status,
	});
	const view = describeList(
		list,
		search,
		status !== "all",
		t("organisation.departments.empty"),
		t
	);
	const columns = useMemo(
		() => [
			nameColumn<Department>(t("organisation.departments.name")),
			statusColumn<Department>(t),
			actionsColumn<Department>(
				t,
				(department) => (
					<>
						<OverflowMenuItem
							disabled={!can("department:update", department.departmentId)}
						>
							{t("organisation.list.editItem")}
						</OverflowMenuItem>
						<OverflowMenuItem
							disabled={!can("department:update", department.departmentId)}
							onClick={() => {
								setChanging(department);
							}}
						>
							{t(
								department.status === "ACTIVE"
									? "organisation.list.deactivateItem"
									: "organisation.list.activateItem"
							)}
						</OverflowMenuItem>
					</>
				),
				// Editing a Department is granted at that Department, its Branch, or company-wide.
				(department) => can("department:update", department.departmentId)
			),
		],
		[t, can]
	);

	return (
		<>
			<h1 className="text-4xl font-medium text-neutral-900">
				{t("organisation.departments.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("organisation.departments.subtitle")}
			</p>
			<ListToolbar
				className="mt-10"
				createLabel={t("organisation.departments.create")}
				search={search}
				searchLabel={t("organisation.departments.search")}
				filter={{
					label: t("organisation.list.showing"),
					value: status,
					options: statusFilterOptions(t, t("organisation.departments.all")),
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
				<CreateDepartmentDialog
					key={companyId}
					companyId={companyId}
					onClose={() => {
						setCreating(false);
					}}
				/>
			)}
			{changing && (
				<ConfirmDialog
					cancelLabel={t("organisation.list.cancel")}
					confirmLabel={t(`${statusKey}Confirm`)}
					description={t(`${statusKey}Description`)}
					submitting={setDepartmentStatus.isPending}
					title={t(`${statusKey}Title`, { name: changing.name })}
					error={
						setDepartmentStatus.error
							? mapRefusal(setDepartmentStatus.error, {
									forbidden: t("organisation.departments.status.forbidden"),
									failed: t("organisation.departments.status.failed"),
								}).message
							: undefined
					}
					onClose={closeChange}
					onConfirm={() => {
						setDepartmentStatus.mutate(
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
						getRowId={(department) => department.departmentId}
						label={t("organisation.departments.label")}
						selection={{ rowLabel: (department) => department.name }}
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
