import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/common/formattingLocale";
import type { FunctionComponent } from "@/common/types";
import { Callout } from "@/components/ui/Callout";
import { DataTable } from "@/components/ui/DataTable";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { MemberImport } from "@/features/people/import/api";
import { rowOutcomeColumns } from "@/features/people/ImportResultPanel/rowOutcomeColumns";

export type ImportResultPanelProps = {
	memberImport: MemberImport;
	/** The next steps, shown once the import has ended. */
	actions?: ReactNode;
};

const isOpen = (memberImport: MemberImport): boolean =>
	memberImport.status === "QUEUED" || memberImport.status === "RUNNING";

/** Rows not added (left out or failed) whose person is still missing: what the result asks the person to act on. */
const rowsNeedingAttention = (memberImport: MemberImport): number =>
	Math.max(
		0,
		memberImport.failedRows +
			memberImport.skippedInvalidRows -
			memberImport.resolvedRows
	);

/**
 * One import as it runs and once it ends: progress while people are being
 * added (announced to screen readers), then the counts and one line per row,
 * each added person linking to their profile. A row the import did not add
 * names its person (for seven days) and, once that person has been added
 * since, says so and links to them, so solved rows stop asking for attention.
 */
export const ImportResultPanel = ({
	memberImport,
	actions,
}: ImportResultPanelProps): FunctionComponent => {
	const { t, i18n } = useTranslation();
	const showsPeople = memberImport.rows.some(
		(outcome) => outcome.name !== null || outcome.email !== null
	);
	const columns = rowOutcomeColumns(t, {
		locale: formattingLocale(i18n),
		showsPeople,
	});
	const stopped = memberImport.status === "FAILED";

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
					rowsNeedingAttention(memberImport) > 0 || stopped ? "warning" : "info"
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
						skipped: memberImport.skippedRows - memberImport.skippedInvalidRows,
						failed: memberImport.failedRows,
					})}
					{memberImport.skippedInvalidRows > 0 &&
						` · ${t("people.importPage.result.leftOut", {
							count: memberImport.skippedInvalidRows,
						})}`}
					{memberImport.correctedRows > 0 &&
						` · ${t("people.importPage.result.corrected", {
							count: memberImport.correctedRows,
						})}`}
				</span>
				{memberImport.resolvedRows > 0 && (
					<span className="block font-normal">
						{t("people.importPage.result.resolvedSummary", {
							count: memberImport.resolvedRows,
						})}
					</span>
				)}
				{stopped && (
					<span className="block font-normal">
						{t("people.importPage.result.stoppedHint", {
							processed: memberImport.processedRows,
							total: memberImport.totalRows,
						})}
					</span>
				)}
				<span className="block font-normal">
					{t("people.importPage.result.meta", {
						date: new Date(memberImport.createdAt).toLocaleString(
							formattingLocale(i18n)
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
