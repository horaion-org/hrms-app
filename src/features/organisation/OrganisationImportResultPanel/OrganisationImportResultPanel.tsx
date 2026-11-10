import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import type { OrganisationImport } from "@/features/organisation/import/api";
import { unitCountsText } from "@/features/organisation/import/importText";
import { organisationRowOutcomeColumns } from "@/features/organisation/OrganisationImportResultPanel/organisationRowOutcomeColumns";

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
							formattingLocale(i18n)
						),
						name: organisationImport.requestedBy,
					})}
				</span>
			</Callout>
			{actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
			<DataTable
				className="mt-6"
				columns={organisationRowOutcomeColumns(t)}
				data={organisationImport.rows}
				getRowId={(outcome) => `${outcome.sheet}:${String(outcome.rowNumber)}`}
				label={t("organisation.import.result.tableLabel")}
			/>
		</section>
	);
};
