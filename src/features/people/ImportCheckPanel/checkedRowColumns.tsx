import type { TFunction } from "i18next";
import type { DataTableColumn } from "@/components/ui/DataTable";
import { flaggedValueCell, problemsCell } from "@/features/imports/checkCells";
import type { CheckedRow } from "@/features/people/import/api";
import { problemText } from "@/features/people/import/importText";

const SHOWN_COLUMNS = [
	"NAME",
	"EMAIL",
	"BRANCH",
	"DEPARTMENT",
	"JOB_TITLE",
] as const;

/**
 * A people import check's columns: the file's row number, the file's
 * person columns with the problem cell outlined, and the row's problems
 * (or that it corrects an email, or that nothing is wrong).
 */
export const checkedRowColumns = (
	t: TFunction
): Array<DataTableColumn<CheckedRow>> => [
	{
		id: "row",
		header: t("people.importPage.check.rowColumn"),
		cell: (row) => row.row,
		headerClassName: "w-16",
	},
	...SHOWN_COLUMNS.map((column) => ({
		id: column,
		header: t(`people.importPage.columns.${column}`),
		cell: (row: CheckedRow) => flaggedValueCell(row, column),
	})),
	{
		id: "problem",
		header: t("people.importPage.check.problemColumn"),
		cell: (row) =>
			problemsCell(
				row.problems,
				(problem) => problemText(problem, t),
				row.status === "CORRECT_EMAIL"
					? t("people.importPage.check.correctsEmail")
					: t("people.importPage.check.noProblem")
			),
		headerClassName: "w-1/3",
	},
];
