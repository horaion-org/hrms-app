import { useState } from "react";
import { useTranslation } from "react-i18next";
import { joinClassNames } from "@/common/joinClassNames";
import type { FunctionComponent } from "@/common/types";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { DownloadIcon, UploadIcon } from "@/components/ui/Icon";
import type { CheckedRow, ImportCheck } from "@/features/people/import/api";
import {
	problemGroups,
	problemText,
	type ProblemGroup,
} from "@/features/people/import/importText";

export type ImportCheckPanelProps = {
	check: ImportCheck;
	onDownloadErrors: () => void;
	onUploadAgain: () => void;
};

const SHOWN_COLUMNS = [
	"NAME",
	"EMAIL",
	"BRANCH",
	"DEPARTMENT",
	"JOB_TITLE",
] as const;

/** A cell the row's problem is about is outlined, so the person sees where to fix. */
const valueCell = (
	row: CheckedRow,
	column: (typeof SHOWN_COLUMNS)[number]
): FunctionComponent => {
	const flagged = row.problems.some(
		(problem) => problem.column === column && problem.severity === "ERROR"
	);
	return (
		<span
			data-flagged={flagged || undefined}
			className={joinClassNames(
				flagged && "rounded px-1 outline-2 outline-error-500"
			)}
		>
			{row.values[column] ?? ""}
		</span>
	);
};

/**
 * The dry run of an import file: what would be added, skipped and fixed,
 * nothing saved. Problems are grouped by kind with their counts, and a group
 * narrows the table to its rows; the cell a problem is about is outlined.
 */
export const ImportCheckPanel = ({
	check,
	onDownloadErrors,
	onUploadAgain,
}: ImportCheckPanelProps): FunctionComponent => {
	const { t } = useTranslation();
	const groups = problemGroups(check.rows);
	const [selected, setSelected] = useState<ProblemGroup | undefined>(undefined);
	const rows = selected
		? check.rows.filter((row) => selected.rowNumbers.includes(row.row))
		: check.rows;
	const columns: Array<DataTableColumn<CheckedRow>> = [
		{
			id: "row",
			header: t("people.importPage.check.rowColumn"),
			cell: (row) => row.row,
			headerClassName: "w-16",
		},
		...SHOWN_COLUMNS.map((column) => ({
			id: column,
			header: t(`people.importPage.columns.${column}`),
			cell: (row: CheckedRow) => valueCell(row, column),
		})),
		{
			id: "problem",
			header: t("people.importPage.check.problemColumn"),
			cell: (row) =>
				row.problems.length === 0 ? (
					t("people.importPage.check.noProblem")
				) : (
					<ul className="flex flex-col gap-1">
						{row.problems.map((problem) => (
							<li
								key={`${problem.code}:${problem.column ?? ""}`}
								className={joinClassNames(
									problem.severity === "ERROR" && "text-error-700"
								)}
							>
								{problemText(problem, t)}
							</li>
						))}
					</ul>
				),
			headerClassName: "w-1/3",
		},
	];

	return (
		<section aria-labelledby="import-check-summary">
			<p className="text-sm font-semibold text-neutral-800">
				{t("people.importPage.check.nothingSaved")}
			</p>
			<Callout
				aria-live="polite"
				className="mt-4"
				id="import-check-summary"
				tone={check.errorRows > 0 ? "warning" : "info"}
			>
				<span className="block">
					{check.errorRows > 0
						? t("people.importPage.check.blocked", { count: check.errorRows })
						: t("people.importPage.check.ready")}
				</span>
				<span className="block font-normal">
					{t("people.importPage.check.summary", {
						ready: check.readyRows,
						skipped: check.skippedRows,
						errors: check.errorRows,
					})}
				</span>
				{check.noticeRows > 0 && (
					<span className="block font-normal">
						{t("people.importPage.check.notices", { count: check.noticeRows })}
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
						{t("people.importPage.check.downloadErrors")}
					</Button>
				)}
				<Button
					leadingIcon={<UploadIcon />}
					size="sm"
					variant="secondary"
					onClick={onUploadAgain}
				>
					{t("people.importPage.check.uploadFixed")}
				</Button>
			</div>
			{check.unknownColumns.length > 0 && (
				<p className="mt-4 text-sm text-neutral-700">
					{t("people.importPage.check.ignoredColumns", {
						columns: check.unknownColumns.join(", "),
					})}
				</p>
			)}
			{groups.length > 0 && (
				<div className="mt-6">
					<h2 className="text-base font-semibold text-neutral-900">
						{t("people.importPage.check.groupsHeading")}
					</h2>
					<ul className="mt-2 flex flex-wrap gap-2">
						<li>
							<Button
								aria-pressed={selected === undefined}
								size="sm"
								variant={selected === undefined ? "primary" : "secondary"}
								onClick={() => {
									setSelected(undefined);
								}}
							>
								{t("people.importPage.check.allRows")}
							</Button>
						</li>
						{groups.map((group) => (
							<li key={group.key}>
								<Button
									aria-pressed={selected?.key === group.key}
									size="sm"
									variant={
										selected?.key === group.key ? "primary" : "secondary"
									}
									onClick={() => {
										setSelected(group);
									}}
								>
									{`${problemText(group.problem, t)} · ${t(
										"people.importPage.check.groupRows",
										{ count: group.rowNumbers.length }
									)}`}
								</Button>
							</li>
						))}
					</ul>
				</div>
			)}
			<DataTable
				className="mt-6"
				columns={columns}
				data={rows}
				getRowId={(row) => String(row.row)}
				label={t("people.importPage.check.tableLabel")}
			/>
		</section>
	);
};
