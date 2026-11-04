import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DownloadIcon, UploadIcon } from "@/components/ui/Icon";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs";
import { flaggedValueCell, problemsCell } from "@/features/imports/checkCells";
import {
	SHEET_COLUMNS,
	type OrganisationCheck,
	type OrganisationCheckedRow,
	type OrganisationSheet,
} from "@/features/organisation/import/api";
import {
	checkHeadline,
	firstSheetToShow,
	problemText,
	sheetSummaries,
	unitCountParts,
	unitCountsText,
} from "@/features/organisation/import/importText";

export type OrganisationCheckPanelProps = {
	check: OrganisationCheck;
	onDownloadErrors: () => void;
	onUploadAgain: () => void;
};

/**
 * The dry run of an organisation file, nothing saved: what would be created,
 * what already exists, and which units the person would head, then each
 * sheet's rows on its own tab with their problems. The summary takes focus
 * when the check arrives, so the outcome is read first.
 */
export const OrganisationCheckPanel = ({
	check,
	onDownloadErrors,
	onUploadAgain,
}: OrganisationCheckPanelProps): FunctionComponent => {
	const { t } = useTranslation();
	const summaryRef = useRef<HTMLDivElement>(null);
	const summaries = sheetSummaries(check.rows);
	const firstSheet = firstSheetToShow(summaries);
	const alreadyExist = unitCountParts(check.alreadyExist);
	const headedByYou = unitCountParts(check.headedByYou);
	useEffect(() => {
		summaryRef.current?.focus();
	}, []);

	const columnsOf = (
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

	return (
		<section aria-labelledby="organisation-check-summary">
			<p className="text-sm font-semibold text-neutral-800">
				{t("organisation.import.check.nothingSaved")}
			</p>
			<Callout
				ref={summaryRef}
				aria-live="polite"
				className="mt-4"
				id="organisation-check-summary"
				tabIndex={-1}
				tone={check.errorRows > 0 ? "warning" : "info"}
			>
				<span className="block">{checkHeadline(check, t)}</span>
				<span className="block font-normal">
					{t("organisation.import.check.willCreate", {
						units: unitCountsText(check.toCreate, t),
					})}
				</span>
				{alreadyExist.length > 0 && (
					<span className="block font-normal">
						{t("organisation.import.check.alreadyExist", {
							units: unitCountsText(check.alreadyExist, t),
						})}
					</span>
				)}
				{headedByYou.length > 0 && (
					<span className="block font-normal">
						{t("organisation.import.check.headedByYou", {
							units: unitCountsText(check.headedByYou, t),
						})}
					</span>
				)}
			</Callout>
			<div className="mt-4 flex flex-wrap gap-3">
				{check.errorRows > 0 && (
					<Button
						leadingIcon={<DownloadIcon />}
						size="sm"
						variant="secondary"
						onClick={onDownloadErrors}
					>
						{t("organisation.import.check.downloadErrors")}
					</Button>
				)}
				<Button
					leadingIcon={<UploadIcon />}
					size="sm"
					variant="secondary"
					onClick={onUploadAgain}
				>
					{t("organisation.import.check.uploadFixed")}
				</Button>
			</div>
			{check.unknownSheets.length > 0 && (
				<p className="mt-4 text-sm text-neutral-700">
					{t("organisation.import.check.ignoredSheets", {
						sheets: check.unknownSheets.join(", "),
					})}
				</p>
			)}
			{check.unknownColumns.length > 0 && (
				<p className="mt-4 text-sm text-neutral-700">
					{t("organisation.import.check.ignoredColumns", {
						columns: check.unknownColumns.join(", "),
					})}
				</p>
			)}
			<Tabs
				className="mt-6"
				defaultIndex={summaries.findIndex(
					(summary) => summary.sheet === firstSheet
				)}
			>
				<TabList
					aria-label={t("organisation.import.check.sheetsLabel")}
					className="flex flex-wrap gap-6"
				>
					{summaries.map(({ sheet, rowCount, errorCount }) => (
						<Tab
							key={sheet}
							count={rowCount}
							countLabel={t("organisation.import.check.sheetRows", {
								count: rowCount,
							})}
						>
							{errorCount > 0
								? `${t(`organisation.import.sheets.${sheet}`)} · ${t(
										"organisation.import.check.sheetErrors",
										{ count: errorCount }
									)}`
								: t(`organisation.import.sheets.${sheet}`)}
						</Tab>
					))}
				</TabList>
				<TabPanels>
					{summaries.map(({ sheet }) => (
						<TabPanel key={sheet}>
							<DataTable
								className="mt-6"
								columns={columnsOf(sheet)}
								data={check.rows.filter((row) => row.sheet === sheet)}
								emptyState={t("organisation.import.check.emptySheet")}
								getRowId={(row) => `${row.sheet}:${String(row.row)}`}
								label={t("organisation.import.check.tableLabel", {
									sheet: t(`organisation.import.sheets.${sheet}`),
								})}
							/>
						</TabPanel>
					))}
				</TabPanels>
			</Tabs>
		</section>
	);
};
