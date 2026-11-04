import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type {
	OrganisationImport,
	OrganisationRowOutcome,
} from "@/features/organisation/import/api";
import { unitCountsText } from "@/features/organisation/import/importText";

export type OrganisationImportResultPanelProps = {
	organisationImport: OrganisationImport;
	/** The next steps, such as importing people. */
	actions?: ReactNode;
};

/**
 * A finished organisation import: what was created and skipped, when and by
 * whom, then one line per row of each sheet. The import is synchronous, so
 * there is no progress to follow.
 */
export const OrganisationImportResultPanel = ({
	organisationImport,
	actions,
}: OrganisationImportResultPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const columns: Array<DataTableColumn<OrganisationRowOutcome>> = [
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

	return (
		<section aria-live="polite">
			<Callout>
				<span className="block">{t("organisation.import.result.heading")}</span>
				<span className="block font-normal">
					{t("organisation.import.result.summary", {
						units: unitCountsText(organisationImport.created, t),
						skipped: organisationImport.skippedRows,
					})}
				</span>
				<span className="block font-normal">
					{t("organisation.import.result.meta", {
						date: new Date(organisationImport.createdAt).toLocaleString(
							i18n.language
						),
						name: organisationImport.requestedBy,
					})}
				</span>
			</Callout>
			{actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
			<DataTable
				className="mt-6"
				columns={columns}
				data={organisationImport.rows}
				getRowId={(outcome) => `${outcome.sheet}:${String(outcome.rowNumber)}`}
				label={t("organisation.import.result.tableLabel")}
			/>
		</section>
	);
};
