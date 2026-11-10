import { getRouteApi } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import { mapRefusal } from "@/common/refusal";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
	DataTable,
	type DataTableColumn,
	type DataTableSort,
} from "@/components/ui/DataTable";
import type { JobTitle } from "@/features/organisation/api";
import { CreateJobTitleDialog } from "@/features/organisation/CreateJobTitleDialog";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	describeList,
	isStatusFilter,
	statusFilterChips,
	statusFilterOptions,
	type StatusFilter,
} from "@/features/organisation/listColumns";
import { jobTitleColumns } from "@/features/organisation/jobTitleColumns";
import { useSetJobTitleStatus } from "@/features/organisation/useChangeListRow";
import { useJobTitles } from "@/features/organisation/useOrganisationList";
import { JOB_TITLE_READ_KEYS } from "@/features/workspace/permissionKeys";
import { departmentScope } from "@/features/workspace/scopes";
import { JOB_TITLES_UNIT_RULES } from "@/features/organisation/listUnitRules";
import { DepartmentFilter } from "@/features/workspace/DepartmentFilter";
import { departmentChips } from "@/features/workspace/filterChips";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import { selectedUnits } from "@/features/workspace/unitSelection";
import { useAccess } from "@/features/workspace/useAccess";
import { useCurrentCompanyId } from "@/features/workspace/useCurrentCompany";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

/** What the status confirm says; deactivating a title people hold names how many keep it. */
const statusChangeCopy = (
	jobTitle: JobTitle,
	t: TFunction
): { title: string; description: string; confirmLabel: string } => {
	const key = "organisation.jobTitles.status";
	if (jobTitle.status === "INACTIVE")
		return {
			title: t(`${key}.activateTitle`, { name: jobTitle.name }),
			description: t(`${key}.activateDescription`),
			confirmLabel: t(`${key}.activateConfirm`),
		};
	const count = jobTitle.holderCount;
	return {
		title: t(`${key}.deactivateTitle`, { name: jobTitle.name }),
		description:
			count > 0
				? t(`${key}.deactivateDescriptionHeld`, { count })
				: t(`${key}.deactivateDescription`),
		confirmLabel:
			count > 0
				? t(`${key}.deactivateConfirmHeld`, { count })
				: t(`${key}.deactivateConfirm`),
	};
};

const route = getRouteApi("/_authenticated/_app/organisation/job-titles");

/**
 * The company's Job titles: HR labels with how many people hold each;
 * holding grants nothing. Narrowed to a Branch and Department kept in the
 * URL; search, status and sort stay on the page.
 */
export const JobTitles = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t, i18n } = useTranslation();
	// Dates follow the browser's region of the app's language (en-GB: day first).
	const locale = formattingLocale(i18n);
	const navigate = route.useNavigate();
	const requested = unitSelectionOf(route.useSearch());
	const units = useUnitSelection(
		companyId,
		JOB_TITLE_READ_KEYS,
		requested,
		JOB_TITLES_UNIT_RULES
	);
	const branchShown = units.branch !== undefined;
	const departmentShown = units.department !== undefined;
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
		...selectedUnits(units),
	});
	const chooseDepartment = (department: string | undefined): void => {
		void navigate({ search: (previous) => ({ ...previous, department }) });
	};
	// The Branch is the header's scope; Department and status are the filters.
	const chips = [
		...departmentChips(
			units,
			() => {
				chooseDepartment(undefined);
			},
			t
		),
		...statusFilterChips(t, status, () => {
			setStatus("all");
		}),
	];
	const filtered = chips.length > 0 || units.branch !== undefined;
	const view = describeList(
		list,
		search,
		filtered,
		t("organisation.jobTitles.empty"),
		t
	);
	const clearFilters = (): void => {
		setStatus("all");
		chooseDepartment(undefined);
	};
	const columns = useMemo(
		(): Array<DataTableColumn<JobTitle>> =>
			jobTitleColumns(t, {
				locale,
				branchShown,
				departmentShown,
				canEdit,
				onEdit: setEditing,
				onChangeStatus: setChanging,
			}),
		[t, locale, canEdit, branchShown, departmentShown]
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
				chips={chips}
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
				filterFields={
					<DepartmentFilter selection={units} onChange={chooseDepartment} />
				}
				onClearFilters={clearFilters}
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
					{...statusChangeCopy(changing, t)}
					cancelLabel={t("organisation.list.cancel")}
					submitting={setJobTitleStatus.isPending}
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
