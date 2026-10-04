import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DataTable, type DataTableSort } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { Branch } from "@/features/organisation/api";
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
import { useBranches } from "@/features/organisation/useOrganisationList";

export const Branches = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
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
		t
	);
	const columns = useMemo(
		() => [
			nameColumn<Branch>(t("organisation.branches.name")),
			statusColumn<Branch>(t),
			actionsColumn<Branch>(t, (branch) => (
				<>
					<OverflowMenuItem>{t("organisation.list.editItem")}</OverflowMenuItem>
					<OverflowMenuItem disabled>
						{t(
							branch.status === "ACTIVE"
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
