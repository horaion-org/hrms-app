import {
	queryOptions,
	type UndefinedInitialDataOptions,
} from "@tanstack/react-query";
import { z } from "zod";
import {
	apiDownload,
	apiRequest,
	type DownloadedFile,
} from "@/common/api-client";
import { companyPath } from "@/features/organisation/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/** The template's data sheets, in the order units are created. */
export const ORGANISATION_SHEETS = [
	"BRANCHES",
	"DEPARTMENTS",
	"JOB_TITLES",
] as const;

export type OrganisationSheet = (typeof ORGANISATION_SHEETS)[number];

/** Each sheet's columns, in the template's order, as the API names them. */
export const SHEET_COLUMNS = {
	BRANCHES: ["CODE", "NAME", "CITY", "COUNTRY", "TIME_ZONE", "HEADS"],
	DEPARTMENTS: ["BRANCH", "NAME", "HEADS"],
	JOB_TITLES: ["BRANCH", "DEPARTMENT", "NAME", "DESCRIPTION"],
} as const satisfies Record<OrganisationSheet, ReadonlyArray<string>>;

export type OrganisationColumn =
	(typeof SHEET_COLUMNS)[OrganisationSheet][number];

/** The most bytes one file may have; the API refuses more. Excel workbooks only. */
export const ORGANISATION_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const ORGANISATION_IMPORT_EXTENSIONS = [".xlsx"] as const;

const sheetSchema = z.enum(ORGANISATION_SHEETS);

const problemSchema = z.object({
	column: z.string().nullable(),
	code: z.string(),
	severity: z.enum(["ERROR", "SKIP", "NOTICE"]),
});

/** One problem of one row: a code for the app to word (ADR-0003). */
export type OrganisationProblem = z.infer<typeof problemSchema>;

const checkedRowSchema = z.object({
	sheet: sheetSchema,
	/** The spreadsheet's own row number. */
	row: z.number(),
	status: z.enum(["READY", "SKIP", "ERROR"]),
	values: z.record(z.string(), z.string()),
	problems: z.array(problemSchema),
});

/** One row of one sheet as the check judged it, with the values as uploaded. */
export type OrganisationCheckedRow = z.infer<typeof checkedRowSchema>;

const unitCountsSchema = z.object({
	branches: z.number(),
	departments: z.number(),
	jobTitles: z.number(),
});

/** A number of branches, departments and job titles. */
export type UnitCounts = z.infer<typeof unitCountsSchema>;

const organisationCheckSchema = z.object({
	totalRows: z.number(),
	readyRows: z.number(),
	skippedRows: z.number(),
	errorRows: z.number(),
	noticeRows: z.number(),
	/** "Sheet › Header" for each column the import ignores. */
	unknownColumns: z.array(z.string()),
	/** Sheets other than the data sheets, Lists and Notes. */
	unknownSheets: z.array(z.string()),
	/** An open people import, which blocks this import until it ends. */
	runningImportId: z.string().nullable(),
	toCreate: unitCountsSchema,
	alreadyExist: unitCountsSchema,
	/** Units whose Heads were left blank, so the person importing heads them. */
	headedByYou: z.object({ branches: z.number(), departments: z.number() }),
	rows: z.array(checkedRowSchema),
});

/** The dry run of a file: nothing has been saved. */
export type OrganisationCheck = z.infer<typeof organisationCheckSchema>;

const rowResultSchema = z.enum([
	"CREATED",
	"SKIPPED_EXISTS",
	"SKIPPED_EXAMPLE",
]);

/** What happened to one row of an organisation import. */
export type OrganisationRowResult = z.infer<typeof rowResultSchema>;

const rowOutcomeSchema = z.object({
	sheet: sheetSchema,
	rowNumber: z.number(),
	result: rowResultSchema,
	unitId: z.string().nullable(),
});

export type OrganisationRowOutcome = z.infer<typeof rowOutcomeSchema>;

const organisationImportSchema = z.object({
	importId: z.string(),
	// Only COMPLETED today; a status a newer API adds reads as UNKNOWN instead of failing the read.
	status: z.enum(["COMPLETED", "UNKNOWN"]).catch("UNKNOWN"),
	requestedBy: z.string(),
	createdAt: z.string(),
	finishedAt: z.string().nullable(),
	totalRows: z.number(),
	createdRows: z.number(),
	skippedRows: z.number(),
	created: unitCountsSchema,
	skipped: unitCountsSchema,
	rows: z.array(rowOutcomeSchema),
});

/** One finished organisation import: its counts and (when read alone) its row outcomes. */
export type OrganisationImport = z.infer<typeof organisationImportSchema>;

const importsPath = (companyId: string): string =>
	`${companyPath(companyId)}/organisation-imports`;

const formWith = (file: File): FormData => {
	const form = new FormData();
	form.append("file", file);
	return form;
};

/** The template, listing the units that exist, countries and time zones. */
export const downloadOrganisationTemplate = (
	companyId: string
): Promise<DownloadedFile> =>
	apiDownload(
		`${importsPath(companyId)}/template`,
		"organisation-import-template.xlsx"
	);

/** Checks a file without saving anything. */
export const checkOrganisationFile = (
	companyId: string,
	file: File
): Promise<OrganisationCheck> =>
	apiRequest(`${importsPath(companyId)}/checks`, organisationCheckSchema, {
		method: "POST",
		body: formWith(file),
	});

/** Checks the file again and, with no errors, creates every unit in it at once. */
export const startOrganisationImport = (
	companyId: string,
	file: File
): Promise<OrganisationImport> =>
	apiRequest(importsPath(companyId), organisationImportSchema, {
		method: "POST",
		body: formWith(file),
	});

/** One finished organisation import, with its row outcomes. */
export const organisationImportQuery = (
	companyId: string,
	importId: string
): UndefinedInitialDataOptions<
	OrganisationImport,
	Error,
	OrganisationImport,
	readonly ["organisation", string, "imports", string]
> =>
	queryOptions({
		queryKey: ["organisation", companyId, "imports", importId] as const,
		queryFn: ({ signal }) =>
			apiRequest(
				`${importsPath(companyId)}/${encodeURIComponent(importId)}`,
				organisationImportSchema,
				{ signal }
			),
		// A finished import never changes.
		staleTime: Infinity,
		meta: administrativeMeta(companyId),
		retry,
	});

/** The company's last organisation imports, newest first, without their rows. */
export const recentOrganisationImportsQuery = (
	companyId: string
): UndefinedInitialDataOptions<
	Array<OrganisationImport>,
	Error,
	Array<OrganisationImport>,
	readonly ["organisation", string, "imports"]
> =>
	queryOptions({
		queryKey: ["organisation", companyId, "imports"] as const,
		queryFn: ({ signal }) =>
			apiRequest(importsPath(companyId), z.array(organisationImportSchema), {
				signal,
			}),
		meta: administrativeMeta(companyId),
		retry,
	});
