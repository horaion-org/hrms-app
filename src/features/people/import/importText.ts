import type { TFunction } from "i18next";
import { importFileProblem, importRefusalCode } from "@/common/importRefusal";
import {
	IMPORT_COLUMNS,
	IMPORT_EXTENSIONS,
	IMPORT_MAX_BYTES,
	type CheckedRow,
	type ImportProblem,
	type MemberImport,
} from "@/features/people/import/api";

/**
 * The template's headers exactly as the API matches them. A downloaded
 * "rows with errors" file keeps them in English so it can be uploaded again
 * whatever the person's language.
 */
export const TEMPLATE_HEADERS: Record<(typeof IMPORT_COLUMNS)[number], string> =
	{
		NAME: "Name",
		EMAIL: "Email",
		BRANCH: "Branch",
		DEPARTMENT: "Department",
		JOB_TITLE: "Job title",
		PHONE: "Phone",
		DATE_OF_BIRTH: "Date of birth",
		EMPLOYMENT_TYPE: "Employment type",
		HIRE_DATE: "Hire date",
		PROBATION_END_DATE: "Probation end date",
	};

const SEVERITY_ORDER = { ERROR: 0, SKIP: 1, NOTICE: 2 } as const;

/** The problems of a check, grouped by what is wrong, worst first and then most frequent. */
export type ProblemGroup = {
	key: string;
	problem: ImportProblem;
	rowNumbers: Array<number>;
};

export const problemGroups = (
	rows: ReadonlyArray<CheckedRow>
): Array<ProblemGroup> => {
	const groups = new Map<string, ProblemGroup>();
	for (const row of rows)
		for (const problem of row.problems) {
			const key = `${problem.code}:${problem.column ?? ""}`;
			const group = groups.get(key) ?? { key, problem, rowNumbers: [] };
			group.rowNumbers.push(row.row);
			groups.set(key, group);
		}
	return [...groups.values()].sort(
		(first, second) =>
			SEVERITY_ORDER[first.problem.severity] -
				SEVERITY_ORDER[second.problem.severity] ||
			second.rowNumbers.length - first.rowNumbers.length
	);
};

/** A template column as the person reads it, or nothing for a whole-row problem. */
export const columnLabel = (column: string | null, t: TFunction): string =>
	column === null ? "" : t(`people.importPage.columns.${column}`, column);

/** One problem as a sentence, worded by the app (ADR-0003); an unknown code keeps its name. */
export const problemText = (problem: ImportProblem, t: TFunction): string =>
	t(`people.importPage.problems.${problem.code}`, problem.code, {
		column: columnLabel(problem.column, t),
	});

/**
 * The rows that need fixing, as uploaded, with their problems in a last
 * column: the person fixes the cells and uploads the file again.
 */
export const errorRowsCsv = (
	rows: ReadonlyArray<CheckedRow>,
	t: TFunction
): Array<Array<string>> => [
	[
		...IMPORT_COLUMNS.map((column) => TEMPLATE_HEADERS[column]),
		t("people.importPage.check.errorsColumn"),
	],
	...rows
		.filter((row) => row.status === "ERROR")
		.map((row) => [
			...IMPORT_COLUMNS.map((column) => row.values[column] ?? ""),
			row.problems.map((problem) => problemText(problem, t)).join("; "),
		]),
];

/** One line per processed row: its number, result and the reason behind it. */
export const resultRowsCsv = (
	memberImport: MemberImport,
	t: TFunction
): Array<Array<string>> => [
	[
		t("people.importPage.result.rowColumn"),
		t("people.importPage.result.resultColumn"),
		t("people.importPage.result.detailColumn"),
	],
	...memberImport.rows.map((outcome) => [
		String(outcome.rowNumber),
		t(`people.importPage.results.${outcome.result}`),
		outcome.code === null
			? ""
			: t(`people.importPage.details.${outcome.code}`, outcome.code),
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
	"IMPORT_MOSTLY_INVALID",
	"INVITATIONS_UNAVAILABLE",
	"RATE_LIMITED",
	"UNKNOWN",
] as const;

/** Why a file or an import was refused; each has its own sentence. */
export type RefusalCode = (typeof REFUSAL_CODES)[number];

/** A file the browser can already tell the API would refuse. */
export const clientFileProblem = (file: File): RefusalCode | undefined =>
	importFileProblem(file, {
		extensions: IMPORT_EXTENSIONS,
		maxBytes: IMPORT_MAX_BYTES,
	});

/** Why the API refused a file or an import, as the code the copy is keyed on. */
export const refusalCode = (error: unknown): RefusalCode =>
	importRefusalCode(error, REFUSAL_CODES);
