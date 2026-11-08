import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type DataTableSort } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { Department } from "@/features/organisation/api";
import { CreateDepartmentDialog } from "@/features/organisation/CreateDepartmentDialog";
import { ListToolbar } from "@/features/organisation/ListToolbar";
import {
	actionsColumn,
	branchColumn,
	createdColumn,
	describeList,
	isStatusFilter,
	statusFilterChips,
	nameColumn,
	statusColumn,
	statusFilterOptions,
	type StatusFilter,
} from "@/features/organisation/listColumns";
import { mapRefusal } from "@/features/organisation/refusal";
import { useSetDepartmentStatus } from "@/features/organisation/useChangeListRow";
import { useCurrentCompanyId } from "@/features/organisation/useCurrentCompanyId";
import { useDepartments } from "@/features/organisation/useOrganisationList";
import { DEPARTMENT_READ_KEYS } from "@/features/workspace/permissionKeys";
import { departmentScope } from "@/features/workspace/scopes";
import { DEPARTMENTS_UNIT_RULES } from "@/features/organisation/listUnitRules";
import { unitSelectionOf } from "@/features/workspace/unitSearch";
import { useAccess } from "@/features/workspace/useAccess";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const route = getRouteApi("/_authenticated/_app/organisation/departments");

/**
 * The company's Departments in the header's Branch, or across every Branch
 * in reach under "All branches". The Branch lives in the URL; search,
 * status and sort stay on the page.
 */
export const Departments = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t, i18n } = useTranslation();
	// Dates follow the browser's region of the app's language (en-GB: day first).
	const locale = formattingLocale(i18n);
	const requested = unitSelectionOf(route.useSearch());
	const units = useUnitSelection(
		companyId,
		DEPARTMENT_READ_KEYS,
		requested,
		DEPARTMENTS_UNIT_RULES
	);
	const branchShown = units.branch !== undefined;
	const [creating, setCreating] = useState(false);
	const [editing, setEditing] = useState<Department>();
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
	const access = useAccess();
	// Creating happens at a Branch the person may create in, so the branch picker needs the Branches.
	const canCreate =
		access.canAnywhere("department:create") &&
		access.canAnywhere("branch:read");
	const canUpdate = useCallback(
		(department: Department): boolean =>
			access.can("department:update", departmentScope(department.departmentId)),
		[access]
	);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [sort, setSort] = useState<DataTableSort>({ id: "name", desc: false });
	const list = useDepartments(companyId, {
		sort: { field: sort.id, desc: sort.desc },
		status: status === "all" ? undefined : status,
		...(units.branch ? { branchId: units.branch.branchId } : {}),
	});
	const chips = statusFilterChips(t, status, () => {
		setStatus("all");
	});
	// One Branch narrows what "no departments" means, so the empty copy says nothing matched.
	const filtered = chips.length > 0 || units.branch !== undefined;
	const view = describeList(
		list,
		search,
		filtered,
		t("organisation.departments.empty"),
		t
	);
	const columns = useMemo(
		() => [
			nameColumn<Department>(t("organisation.departments.name")),
			// A Branch already chosen is not repeated on every row.
			...(branchShown ? [] : [branchColumn<Department>(t)]),
			statusColumn<Department>(t),
			createdColumn<Department>(t, locale),
			actionsColumn<Department>(
				t,
				(department) => (
					<>
						<OverflowMenuItem
							disabled={!canUpdate(department)}
							onClick={() => {
								setEditing(department);
							}}
						>
							{t("organisation.list.editItem")}
						</OverflowMenuItem>
						<OverflowMenuItem
							disabled={!canUpdate(department)}
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
				// Effective at the Department, whether granted there, at its Branch, or company-wide.
				canUpdate,
				setEditing
			),
		],
		[t, locale, canUpdate, branchShown]
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
				chips={chips}
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
				<CreateDepartmentDialog
					key={companyId}
					companyId={companyId}
					onClose={() => {
						setCreating(false);
					}}
				/>
			)}
			{editing && canUpdate(editing) && (
				<CreateDepartmentDialog
					key={`${companyId}-${editing.departmentId}`}
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
