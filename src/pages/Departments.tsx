import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
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
	branchColumn,
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
import { DEPARTMENT_READ_KEYS } from "@/features/workspace/permissionKeys";
import { departmentScope } from "@/features/workspace/scopes";
import {
	unitSearchFor,
	unitSelectionOf,
} from "@/features/workspace/unitSearch";
import {
	clearedUnits,
	unitsNarrowed,
	type UnitSelection,
} from "@/features/workspace/unitSelection";
import { UnitSelector } from "@/features/workspace/UnitSelector";
import { useAccess } from "@/features/workspace/useAccess";
import { useUnitSelection } from "@/features/workspace/useUnitSelection";

const route = getRouteApi("/_authenticated/_app/organisation/departments");

/** Every Branch by default; the Departments list has no Department filter of its own. */
const UNIT_RULES = { allowAllBranches: true, withDepartment: false };

/**
 * The company's Departments across the Branches in reach, one Branch at a
 * time when one is chosen. The Branch lives in the URL; search, status and
 * sort stay on the page.
 */
export const Departments = (): FunctionComponent => {
	const companyId = useCurrentCompanyId();
	const { t } = useTranslation();
	const navigate = route.useNavigate();
	const requested = unitSelectionOf(route.useSearch());
	const units = useUnitSelection(
		companyId,
		DEPARTMENT_READ_KEYS,
		requested,
		UNIT_RULES
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
	const filtered = status !== "all" || unitsNarrowed(units);
	const view = describeList(
		list,
		search,
		filtered,
		t("organisation.departments.empty"),
		t
	);
	const chooseUnits = (next: UnitSelection, cleanup = false): void => {
		// Taking out a unit the page cannot show replaces the history entry instead of adding one.
		void navigate({
			search: (previous) => ({ ...previous, ...unitSearchFor(next) }),
			replace: cleanup,
		});
	};
	const clearFilters = (): void => {
		setStatus("all");
		chooseUnits(clearedUnits(units, requested));
	};
	const columns = useMemo(
		() => [
			nameColumn<Department>(t("organisation.departments.name")),
			// A Branch already chosen is not repeated on every row.
			...(branchShown ? [] : [branchColumn<Department>(t)]),
			statusColumn<Department>(t),
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
		[t, canUpdate, branchShown]
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
				scope={
					<UnitSelector
						requested={requested}
						selection={units}
						onChange={chooseUnits}
					/>
				}
				onClearFilters={filtered ? clearFilters : undefined}
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
