import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
import { mapRefusal } from "@/features/organisation/refusal";
import { useSetJobTitleStatus } from "@/features/organisation/useChangeListRow";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useJobTitles } from "@/features/organisation/useOrganisationList";
import { placeOf } from "@/features/organisation/assignmentTargets";
import { departmentScope } from "@/features/workspace/scopes";
import { useAccess } from "@/features/workspace/useAccess";

/** The company's Job titles: HR labels only, so no role or headcount columns yet. */
export const JobTitles = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const [creating, setCreating] = useState(false);
	// Creating needs the key at some department; editing a title needs it at that title's department.
	const access = useAccess();
	const canCreate = access.canAnywhere("job_title:create");
	const canEdit = useCallback(
		(jobTitle: JobTitle): boolean =>
			access.can("job_title:update", departmentScope(jobTitle.departmentId)),
		[access]
	);
	const [editing, setEditing] = useState<JobTitle>();
	// The Job title whose status the person asked to change, until they confirm or cancel.
	const [changing, setChanging] = useState<JobTitle>();
	const setJobTitleStatus = useSetJobTitleStatus(companyId);
	const statusKey = `organisation.jobTitles.status.${
		changing?.status === "ACTIVE" ? "deactivate" : "activate"
	}` as const;
	const closeChange = (): void => {
		setJobTitleStatus.reset();
		setChanging(undefined);
	};
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
			{
				id: "department",
				header: t("organisation.jobTitles.department"),
				cell: (jobTitle: JobTitle): string => placeOf(jobTitle, t),
			},
			statusColumn<JobTitle>(t),
			actionsColumn<JobTitle>(
				t,
				(jobTitle) => (
					<OverflowMenuItem
						disabled={!canEdit(jobTitle)}
						onClick={() => {
							setChanging(jobTitle);
						}}
					>
						{t(
							jobTitle.status === "ACTIVE"
								? "organisation.list.deactivateItem"
								: "organisation.list.activateItem"
						)}
					</OverflowMenuItem>
				),
				canEdit,
				setEditing
			),
		],
		[t, canEdit]
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
			{editing && (
				<CreateJobTitleDialog
					key={editing.jobTitleId}
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
					submitting={setJobTitleStatus.isPending}
					title={t(`${statusKey}Title`, { name: changing.name })}
					error={
						setJobTitleStatus.error
							? mapRefusal(setJobTitleStatus.error, {
									forbidden: t("organisation.jobTitles.status.forbidden"),
									failed: t("organisation.jobTitles.status.failed"),
								}).message
							: undefined
					}
					onClose={closeChange}
					onConfirm={() => {
						setJobTitleStatus.mutate(
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
