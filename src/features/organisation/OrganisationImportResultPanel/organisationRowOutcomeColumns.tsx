import type { TFunction } from "i18next";
import type { DataTableColumn } from "@/components/ui/DataTable";
import type { OrganisationRowOutcome } from "@/features/organisation/import/api";

/** An organisation import's result columns: the sheet, the row number and what happened. */
export const organisationRowOutcomeColumns = (
	t: TFunction
): Array<DataTableColumn<OrganisationRowOutcome>> => [
	{
		id: "sheet",
		header: t("organisation.import.result.sheetColumn"),
		cell: (outcome) => t(`organisation.import.sheets.${outcome.sheet}`),
	},
	{
		id: "row",
		header: t("organisation.import.result.rowColumn"),
		cell: (outcome) => outcome.rowNumber,
		headerClassName: "w-16",
	},
	{
		id: "result",
		header: t("organisation.import.result.resultColumn"),
		cell: (outcome) => t(`organisation.import.results.${outcome.result}`),
	},
];
