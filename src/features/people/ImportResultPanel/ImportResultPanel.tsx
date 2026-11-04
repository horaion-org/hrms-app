import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { MemberImport, RowOutcome } from "@/features/people/import/api";

export type ImportResultPanelProps = {
	memberImport: MemberImport;
	/** The next steps, shown once the import has ended. */
	actions?: ReactNode;
};

const isOpen = (memberImport: MemberImport): boolean =>
	memberImport.status === "QUEUED" || memberImport.status === "RUNNING";

/**
 * One import as it runs and once it ends: progress while people are being
 * added (announced to screen readers), then the counts and one line per row,
 * each added person linking to their profile.
 */
export const ImportResultPanel = ({
	memberImport,
	actions,
}: ImportResultPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const columns: Array<DataTableColumn<RowOutcome>> = [
		{
			id: "row",
			header: t("people.importPage.result.rowColumn"),
			cell: (outcome) => outcome.rowNumber,
			headerClassName: "w-16",
		},
		{
			id: "result",
			header: t("people.importPage.result.resultColumn"),
			cell: (outcome) => t(`people.importPage.results.${outcome.result}`),
		},
		{
			id: "detail",
			header: t("people.importPage.result.detailColumn"),
			cell: (outcome): ReactNode =>
				outcome.membershipId ? (
					<span className="flex flex-wrap gap-2">
						{outcome.code &&
							t(`people.importPage.details.${outcome.code}`, outcome.code)}
						<Link
							className="font-semibold text-ink-blue-700 underline"
							params={{ membershipId: outcome.membershipId }}
							to="/people/$membershipId"
						>
							{t("people.importPage.result.open")}
						</Link>
					</span>
				) : (
					outcome.code &&
					t(`people.importPage.details.${outcome.code}`, outcome.code)
				),
		},
	];

	if (isOpen(memberImport))
		return (
			<section aria-live="polite">
				<h2 className="text-xl font-semibold text-neutral-900">
					{t("people.importPage.progress.heading")}
				</h2>
				<ProgressBar
					className="mt-4"
					label={t("people.importPage.progress.label", {
						done: memberImport.processedRows,
						total: memberImport.totalRows,
					})}
					value={
						memberImport.totalRows === 0
							? 0
							: Math.round(
									(memberImport.processedRows / memberImport.totalRows) * 100
								)
					}
				/>
				<p className="mt-2 text-sm text-neutral-700">
					{t("people.importPage.progress.label", {
						done: memberImport.processedRows,
						total: memberImport.totalRows,
					})}
				</p>
				<p className="mt-4 text-sm text-neutral-700">
					{t("people.importPage.progress.hint")}
				</p>
			</section>
		);

	return (
		<section aria-live="polite">
			<Callout
				tone={
					memberImport.failedRows > 0 || memberImport.status === "FAILED"
						? "warning"
						: "info"
				}
			>
				<span className="block">
					{memberImport.status === "FAILED"
						? t("people.importPage.result.failed")
						: t("people.importPage.result.heading")}
				</span>
				<span className="block font-normal">
					{t("people.importPage.result.summary", {
						added: memberImport.addedRows - memberImport.invitePendingRows,
						pending: memberImport.invitePendingRows,
						skipped: memberImport.skippedRows,
						failed: memberImport.failedRows,
					})}
				</span>
				<span className="block font-normal">
					{t("people.importPage.result.meta", {
						date: new Date(memberImport.createdAt).toLocaleString(
							i18n.language
						),
						name: memberImport.requestedBy,
					})}
				</span>
			</Callout>
			{actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
			<DataTable
				className="mt-6"
				columns={columns}
				data={memberImport.rows}
				getRowId={(outcome) => String(outcome.rowNumber)}
				label={t("people.importPage.result.tableLabel")}
			/>
		</section>
	);
};
