import type { TFunction } from "i18next";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { flaggedValueCell, problemsCell } from "@/features/imports/checkCells";
import {
	SHEET_COLUMNS,
	type OrganisationCheckedRow,
	type OrganisationSheet,
} from "@/features/organisation/import/api";
import { problemText } from "@/features/organisation/import/importText";

/**
 * One sheet's columns in an organisation import check: the row number, that
 * sheet's columns with the problem cell outlined, and the row's problems.
 */
export const organisationCheckedRowColumns = (
	t: TFunction,
	sheet: OrganisationSheet
): Array<DataTableColumn<OrganisationCheckedRow>> => [
	{
		id: "row",
		header: t("organisation.import.check.rowColumn"),
		cell: (row) => row.row,
		headerClassName: "w-16",
	},
	...SHEET_COLUMNS[sheet].map((column) => ({
		id: column,
		header: t(`organisation.import.columns.${column}`),
		cell: (row: OrganisationCheckedRow) => flaggedValueCell(row, column),
	})),
	{
		id: "problem",
		header: t("organisation.import.check.problemColumn"),
		cell: (row) =>
			problemsCell(
				row.problems,
				(problem) => problemText(problem, t),
				t("organisation.import.check.noProblem")
			),
		headerClassName: "w-1/3",
	},
];
