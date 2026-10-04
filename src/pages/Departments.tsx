import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DataTable, type DataTableSort } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { Department } from "@/features/organisation/api";
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
import { useDepartments } from "@/features/organisation/useOrganisationList";

export const Departments = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
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
			actionsColumn<Department>(t, (department) => (
				<>
					<OverflowMenuItem>{t("organisation.list.editItem")}</OverflowMenuItem>
					<OverflowMenuItem disabled>
						{t(
							department.status === "ACTIVE"
								? "organisation.list.deactivateItem"
								: "organisation.list.activateItem"
						)}
					</OverflowMenuItem>
				</>
			)),
		],
		[t]
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
			/>
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
