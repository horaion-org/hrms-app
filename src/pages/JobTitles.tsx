import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { UnitStatus } from "@/features/organisation/api";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	actionsColumn,
	isStatusFilter,
	matchesSearch,
	nameColumn,
	statusColumn,
	statusFilterOptions,
	type StatusFilter,
} from "@/features/organisation/listColumns";

/** The design's Job Title row. The API has no Job Titles yet, so none load. */
type JobTitle = {
	id: string;
	name: string;
	systemRole: string;
	employeeCount: number;
	status: UnitStatus;
};

const JOB_TITLES: Array<JobTitle> = [];

export const JobTitles = (): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const rows = useMemo(
		() =>
			JOB_TITLES.filter(
				(jobTitle) =>
					(status === "all" || jobTitle.status === status) &&
					matchesSearch(jobTitle.name, search)
			),
		[search, status]
	);
	const columns = useMemo((): Array<DataTableColumn<JobTitle>> => {
		const numbers = new Intl.NumberFormat(i18n.language);
		return [
			nameColumn<JobTitle>(t("organisation.jobTitles.name")),
			{
				id: "systemRole",
				header: t("organisation.jobTitles.systemRole"),
				cell: (jobTitle) => jobTitle.systemRole,
				sortValue: (jobTitle) => jobTitle.systemRole,
			},
			{
				id: "employeeCount",
				header: t("organisation.jobTitles.employeeCount"),
				cell: (jobTitle) => numbers.format(jobTitle.employeeCount),
				sortValue: (jobTitle) => jobTitle.employeeCount,
			},
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
		];
	}, [t, i18n.language]);

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
			/>
			<DataTable
				className="mt-8"
				columns={columns}
				data={rows}
				defaultSort={{ id: "name", desc: false }}
				emptyState={t("organisation.jobTitles.empty")}
				getRowId={(jobTitle) => jobTitle.id}
				label={t("organisation.jobTitles.label")}
				selection={{ rowLabel: (jobTitle) => jobTitle.name }}
			/>
		</>
	);
};
