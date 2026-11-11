import type { TFunction } from "i18next";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { Department } from "@/features/organisation/api";
import {
	actionsColumn,
	branchColumn,
	createdColumn,
	nameColumn,
	statusColumn,
} from "@/features/organisation/listColumns";

export type DepartmentColumnsOptions = {
	/** The locale dates are written in. */
	locale: string;
	/** A Branch is chosen, so it is not repeated on every row. */
	branchShown: boolean;
	/** Effective at the Department, whether granted there, at its Branch, or company-wide. */
	canUpdate: (department: Department) => boolean;
	onEdit: (department: Department) => void;
	onChangeStatus: (department: Department) => void;
};

/**
 * The Departments list's columns: name, its Branch (unless one is chosen),
 * status, when created and the row actions. Phones keep the name and the
 * actions; Status joins from `sm`, as on People.
 */
export const departmentColumns = (
	t: TFunction,
	{
		locale,
		branchShown,
		canUpdate,
		onEdit,
		onChangeStatus,
	}: DepartmentColumnsOptions
): Array<DataTableColumn<Department>> => [
	nameColumn<Department>(t("organisation.departments.name")),
	...(branchShown ? [] : [branchColumn<Department>(t)]),
	{ ...statusColumn<Department>(t), hideBelow: "sm" },
	createdColumn<Department>(t, locale),
	actionsColumn<Department>(
		t,
		(department) => (
			<>
				<OverflowMenuItem
					disabled={!canUpdate(department)}
					onClick={() => {
						onEdit(department);
					}}
				>
					{t("organisation.list.editItem")}
				</OverflowMenuItem>
				<OverflowMenuItem
					disabled={!canUpdate(department)}
					onClick={() => {
						onChangeStatus(department);
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
		canUpdate,
		onEdit
	),
];
