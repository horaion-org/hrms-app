import type { TFunction } from "i18next";
import { importFileProblem, importRefusalCode } from "@/common/importRefusal";
import {
	ORGANISATION_IMPORT_EXTENSIONS,
	ORGANISATION_IMPORT_MAX_BYTES,
	ORGANISATION_SHEETS,
	SHEET_COLUMNS,
	type OrganisationCheck,
	type OrganisationCheckedRow,
	type OrganisationColumn,
	type OrganisationImport,
	type OrganisationProblem,
	type OrganisationSheet,
	type UnitCounts,
} from "@/features/organisation/import/api";

/** The template's sheet and column names exactly as the API matches them, for downloaded files. */
export const SHEET_NAMES: Record<OrganisationSheet, string> = {
	BRANCHES: "Branches",
	DEPARTMENTS: "Departments",
	JOB_TITLES: "Job titles",
};

export const TEMPLATE_HEADERS: Record<OrganisationColumn, string> = {
	CODE: "Code",
	NAME: "Name",
	CITY: "City",
	COUNTRY: "Country",
	TIME_ZONE: "Time zone",
	HEADS: "Heads",
	BRANCH: "Branch",
	DEPARTMENT: "Department",
	DESCRIPTION: "Description",
};

/** Every column of every sheet once, in template order: the columns of a file listing rows of any sheet. */
const ALL_COLUMNS: ReadonlyArray<OrganisationColumn> = [
	...new Set(ORGANISATION_SHEETS.flatMap((sheet) => SHEET_COLUMNS[sheet])),
];

/** How many rows one sheet has, and how many of them need fixing. */
export type SheetSummary = {
	sheet: OrganisationSheet;
	rowCount: number;
	errorCount: number;
};

export const sheetSummaries = (
	rows: ReadonlyArray<OrganisationCheckedRow>
): Array<SheetSummary> =>
	ORGANISATION_SHEETS.map((sheet) => {
		const ofSheet = rows.filter((row) => row.sheet === sheet);
		return {
			sheet,
			rowCount: ofSheet.length,
			errorCount: ofSheet.filter((row) => row.status === "ERROR").length,
		};
	});

/** The sheet to open first: the first with an error, else the first with rows. */
export const firstSheetToShow = (
	summaries: ReadonlyArray<SheetSummary>
): OrganisationSheet =>
	(
		summaries.find((summary) => summary.errorCount > 0) ??
		summaries.find((summary) => summary.rowCount > 0)
	)?.sheet ?? "BRANCHES";

const UNIT_KINDS = ["branches", "departments", "jobTitles"] as const;

/** A kind of unit, as the counts name it. */
export type UnitKind = (typeof UNIT_KINDS)[number];

/** The kinds with at least one unit, in creation order. */
export const unitCountParts = (
	counts: Partial<UnitCounts>
): Array<{ kind: UnitKind; count: number }> =>
	UNIT_KINDS.flatMap((kind) => {
		const count = counts[kind] ?? 0;
		return count > 0 ? [{ kind, count }] : [];
	});

/** "4 branches · 18 departments · 36 job titles", leaving out kinds with none. */
export const unitCountsText = (
	counts: Partial<UnitCounts>,
	t: TFunction
): string => {
	const parts = unitCountParts(counts);
	if (parts.length === 0) return t("organisation.import.counts.none");
	return parts
		.map(({ kind, count }) =>
			t(`organisation.import.counts.${kind}`, { count })
		)
		.join(" · ");
};

/** Whether the file would create anything: the import has nothing to do otherwise. */
export const createsAnything = (check: OrganisationCheck): boolean =>
	unitCountParts(check.toCreate).length > 0;

/** The check's first line: what blocks the import, that it is ready, or that it has nothing to do. */
export const checkHeadline = (
	check: OrganisationCheck,
	t: TFunction
): string => {
	if (check.errorRows > 0)
		return t("organisation.import.check.blocked", { count: check.errorRows });
	return createsAnything(check)
		? t("organisation.import.check.ready")
		: t("organisation.import.check.nothingToCreate");
};

/** A template column as the person reads it, or nothing for a whole-row problem. */
export const columnLabel = (column: string | null, t: TFunction): string =>
	column === null ? "" : t(`organisation.import.columns.${column}`, column);

/** One problem as a sentence, worded by the app (ADR-0003); an unknown code keeps its name. */
export const problemText = (
	problem: OrganisationProblem,
	t: TFunction
): string =>
	t(`organisation.import.problems.${problem.code}`, problem.code, {
		column: columnLabel(problem.column, t),
	});

/**
 * The rows that need fixing, as uploaded, with their sheet first and their
 * problems last, so the person can find each in the workbook.
 */
export const errorRowsCsv = (
	rows: ReadonlyArray<OrganisationCheckedRow>,
	t: TFunction
): Array<Array<string>> => [
	[
		t("organisation.import.check.sheetColumn"),
		t("organisation.import.check.rowColumn"),
		...ALL_COLUMNS.map((column) => TEMPLATE_HEADERS[column]),
		t("organisation.import.check.errorsColumn"),
	],
	...rows
		.filter((row) => row.status === "ERROR")
		.map((row) => [
			SHEET_NAMES[row.sheet],
			String(row.row),
			...ALL_COLUMNS.map((column) => row.values[column] ?? ""),
			row.problems.map((problem) => problemText(problem, t)).join("; "),
		]),
];

/** One line per row of a finished import: its sheet, number and result. */
export const resultRowsCsv = (
	organisationImport: OrganisationImport,
	t: TFunction
): Array<Array<string>> => [
	[
		t("organisation.import.result.sheetColumn"),
		t("organisation.import.result.rowColumn"),
		t("organisation.import.result.resultColumn"),
	],
	...organisationImport.rows.map((outcome) => [
		SHEET_NAMES[outcome.sheet],
		String(outcome.rowNumber),
		t(`organisation.import.results.${outcome.result}`),
	]),
];

const REFUSAL_CODES = [
	"UNSUPPORTED_FILE",
	"MISSING_COLUMNS",
	"EMPTY_FILE",
	"TOO_MANY_ROWS",
	"FILE_TOO_LARGE",
	"IMPORT_RUNNING",
	"IMPORT_HAS_ERRORS",
	"RATE_LIMITED",
	"UNKNOWN",
] as const;

/** Why a file or an import was refused; each has its own sentence. */
export type OrganisationRefusalCode = (typeof REFUSAL_CODES)[number];

/** A file the browser can already tell the API would refuse. */
export const clientFileProblem = (
	file: File
): OrganisationRefusalCode | undefined =>
	importFileProblem(file, {
		extensions: ORGANISATION_IMPORT_EXTENSIONS,
		maxBytes: ORGANISATION_IMPORT_MAX_BYTES,
	});

/** Why the API refused a file or an import, as the code the copy is keyed on. */
export const refusalCode = (error: unknown): OrganisationRefusalCode =>
	importRefusalCode(error, REFUSAL_CODES);
