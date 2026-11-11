import type { TFunction } from "i18next";
import type { ReactNode } from "react";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { OverflowMenuItem } from "@/components/ui/OverflowMenu";
import type { JobTitle } from "@/features/organisation/api";
import {
	actionsColumn,
	branchColumn,
	createdColumn,
	nameColumn,
	statusColumn,
} from "@/features/organisation/listColumns";

export type JobTitleColumnsOptions = {
	/** The locale dates are written in. */
	locale: string;
	/** A Branch is chosen, so it is not repeated on every row. */
	branchShown: boolean;
	/** A Department is chosen, so it is not repeated on every row. */
	departmentShown: boolean;
	canEdit: (jobTitle: JobTitle) => boolean;
	onEdit: (jobTitle: JobTitle) => void;
	onChangeStatus: (jobTitle: JobTitle) => void;
};

/**
 * The Job titles list's columns: name with its description, its Branch and
 * Department (unless chosen), how many people hold it, status, when created
 * and the row actions. Phones keep the name and the actions; Status joins
 * from `sm`, as on People, and the rest from `md`.
 */
export const jobTitleColumns = (
	t: TFunction,
	{
		locale,
		branchShown,
		departmentShown,
		canEdit,
		onEdit,
		onChangeStatus,
	}: JobTitleColumnsOptions
): Array<DataTableColumn<JobTitle>> => [
	nameColumn<JobTitle>(
		t("organisation.jobTitles.name"),
		(jobTitle) => jobTitle.description
	),
	...(branchShown ? [] : [branchColumn<JobTitle>(t)]),
	...(departmentShown
		? []
		: [
				{
					id: "department",
					header: t("organisation.jobTitles.department"),
					cell: (jobTitle: JobTitle): string => jobTitle.departmentName,
					hideBelow: "md",
				} satisfies DataTableColumn<JobTitle>,
			]),
	{
		id: "people",
		header: t("organisation.jobTitles.people"),
		// Plain text until People can be filtered by job title; nobody holding it reads muted.
		cell: (jobTitle: JobTitle): ReactNode => (
			<span
				className={jobTitle.holderCount === 0 ? "text-neutral-700" : undefined}
			>
				{t("organisation.jobTitles.peopleCount", {
					count: jobTitle.holderCount,
				})}
			</span>
		),
		hideBelow: "md",
	},
	{ ...statusColumn<JobTitle>(t), hideBelow: "sm" },
	createdColumn<JobTitle>(t, locale),
	actionsColumn<JobTitle>(
		t,
		(jobTitle) => (
			<OverflowMenuItem
				disabled={!canEdit(jobTitle)}
				onClick={() => {
					onChangeStatus(jobTitle);
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
		onEdit
	),
];
