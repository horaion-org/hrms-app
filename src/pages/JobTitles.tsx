import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DataTable, type DataTableSort } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { JobTitle } from "@/features/organisation/api";
import { CreateJobTitleDialog } from "@/features/organisation/CreateJobTitleDialog";
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
import { useJobTitles } from "@/features/organisation/useOrganisationList";
import { companyPermissions, workspaceQuery } from "@/features/workspace/api";

/** The company's Job titles: HR labels only, so no role or headcount columns yet. */
export const JobTitles = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const [creating, setCreating] = useState(false);
	const workspace = useQuery(workspaceQuery);
	const canCreate = workspace.data
		? companyPermissions(workspace.data, companyId).has("job_title:create")
		: false;
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [sort, setSort] = useState<DataTableSort>({ id: "name", desc: false });
	const list = useJobTitles(companyId, {
		sort: { field: sort.id, desc: sort.desc },
		status: status === "all" ? undefined : status,
	});
	const view = describeList(
		list,
		search,
		status !== "all",
		t("organisation.jobTitles.empty"),
		t
	);
	const columns = useMemo(
		() => [
			nameColumn<JobTitle>(t("organisation.jobTitles.name")),
			statusColumn<JobTitle>(t),
			actionsColumn<JobTitle>(t, (jobTitle) => (
				<>
					<OverflowMenuItem>{t("organisation.list.editItem")}</OverflowMenuItem>
					<OverflowMenuItem disabled>
						{t(
							jobTitle.status === "ACTIVE"
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
				{t("organisation.jobTitles.title")}
			</h1>
			<p className="mt-4 text-sm text-neutral-800">
				{t("organisation.jobTitles.subtitle")}
			</p>
			<ListToolbar
				className="mt-10"
				createLabel={t("organisation.jobTitles.create")}
				search={search}
				searchLabel={t("organisation.jobTitles.search")}
				filter={{
					label: t("organisation.list.showing"),
					value: status,
					options: statusFilterOptions(t, t("organisation.jobTitles.all")),
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
				<CreateJobTitleDialog
					key={companyId}
					companyId={companyId}
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
						getRowId={(jobTitle) => jobTitle.jobTitleId}
						label={t("organisation.jobTitles.label")}
						selection={{ rowLabel: (jobTitle) => jobTitle.name }}
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
