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
import type { PeopleQuery } from "@/features/people/api";
import { administrativeMeta } from "@/features/workspace/queryAccess";
import { retry } from "@/features/workspace/retry";

/** The template's columns, in the template's order, as the API names them. */
export const IMPORT_COLUMNS = [
	"NAME",
	"EMAIL",
	"BRANCH",
	"DEPARTMENT",
	"JOB_TITLE",
	"PHONE",
	"DATE_OF_BIRTH",
	"EMPLOYMENT_TYPE",
	"HIRE_DATE",
	"PROBATION_END_DATE",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

/** The most rows and bytes one import takes; the API refuses more. */
export const IMPORT_MAX_ROWS = 500;
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_EXTENSIONS = [".xlsx", ".csv"] as const;

const problemSchema = z.object({
	column: z.string().nullable(),
	code: z.string(),
	severity: z.enum(["ERROR", "SKIP", "NOTICE"]),
});

/** One problem of one row: a code for the app to word (ADR-0003). */
export type ImportProblem = z.infer<typeof problemSchema>;

const checkedRowSchema = z.object({
	row: z.number(),
	status: z.enum(["READY", "SKIP", "ERROR"]),
	values: z.record(z.string(), z.string()),
	problems: z.array(problemSchema),
});

/** One row of the file as the check judged it, with the values as uploaded. */
export type CheckedRow = z.infer<typeof checkedRowSchema>;

const importCheckSchema = z.object({
	totalRows: z.number(),
	readyRows: z.number(),
	skippedRows: z.number(),
	errorRows: z.number(),
	noticeRows: z.number(),
	unknownColumns: z.array(z.string()),
	invitationsAvailable: z.boolean(),
	runningImportId: z.string().nullable(),
	rows: z.array(checkedRowSchema),
});

/** The dry run of a file: nothing has been saved. */
export type ImportCheck = z.infer<typeof importCheckSchema>;

const rowResultSchema = z.enum([
	"ADDED",
	"ADDED_INVITE_PENDING",
	"SKIPPED_EXISTS",
	"FAILED_ACCOUNT",
	"FAILED_VALIDATION",
]);

/** What happened to one row of an import. */
export type RowResult = z.infer<typeof rowResultSchema>;

const rowOutcomeSchema = z.object({
	rowNumber: z.number(),
	result: rowResultSchema,
	code: z.string().nullable(),
	membershipId: z.string().nullable(),
});

export type RowOutcome = z.infer<typeof rowOutcomeSchema>;

const memberImportSchema = z.object({
	importId: z.string(),
	status: z.enum(["QUEUED", "RUNNING", "COMPLETED", "FAILED"]),
	requestedBy: z.string(),
	sendInvitations: z.boolean(),
	totalRows: z.number(),
	processedRows: z.number(),
	addedRows: z.number(),
	invitePendingRows: z.number(),
	skippedRows: z.number(),
	failedRows: z.number(),
	createdAt: z.string(),
	finishedAt: z.string().nullable(),
	rows: z.array(rowOutcomeSchema),
});

/** One import: its progress, counts and (when read alone) its row outcomes. */
export type MemberImport = z.infer<typeof memberImportSchema>;

const importsPath = (companyId: string): string =>
	`${companyPath(companyId)}/member-imports`;

const formWith = (file: File): FormData => {
	const form = new FormData();
	form.append("file", file);
	return form;
};

/** The template, listing the units the person may import into. */
export const downloadImportTemplate = (
	companyId: string
): Promise<DownloadedFile> =>
	apiDownload(
		`${importsPath(companyId)}/template`,
		"people-import-template.xlsx"
	);

/** Checks a file without saving anything. */
export const checkImportFile = (
	companyId: string,
	file: File
): Promise<ImportCheck> =>
	apiRequest(`${importsPath(companyId)}/checks`, importCheckSchema, {
		method: "POST",
		body: formWith(file),
	});

/** Checks the file again and, with no errors, starts adding its people in the background. */
export const startImport = (
	companyId: string,
	file: File,
	sendInvitations: boolean
): Promise<MemberImport> =>
	apiRequest(
		`${importsPath(companyId)}?sendInvitations=${String(sendInvitations)}`,
		memberImportSchema,
		{ method: "POST", body: formWith(file) }
	);

const isOpen = (memberImport: MemberImport | undefined): boolean =>
	memberImport?.status === "QUEUED" || memberImport?.status === "RUNNING";

/** One import, read again every two seconds while it is still adding people. */
export const memberImportQuery = (
	companyId: string,
	importId: string
): UndefinedInitialDataOptions<
	MemberImport,
	Error,
	MemberImport,
	readonly ["people", string, "imports", string]
> =>
	queryOptions({
		queryKey: ["people", companyId, "imports", importId] as const,
		queryFn: ({ signal }) =>
			apiRequest(
				`${importsPath(companyId)}/${encodeURIComponent(importId)}`,
				memberImportSchema,
				{
					signal,
				}
			),
		refetchInterval: (query) => (isOpen(query.state.data) ? 2_000 : false),
		meta: administrativeMeta(companyId),
		retry,
	});

/** The company's recent imports the person may read, newest first. */
export const recentImportsQuery = (
	companyId: string
): UndefinedInitialDataOptions<
	Array<MemberImport>,
	Error,
	Array<MemberImport>,
	readonly ["people", string, "imports"]
> =>
	queryOptions({
		queryKey: ["people", companyId, "imports"] as const,
		queryFn: ({ signal }) =>
			apiRequest(importsPath(companyId), z.array(memberImportSchema), {
				signal,
			}),
		meta: administrativeMeta(companyId),
		retry,
	});

/** The People list as filtered now, as a spreadsheet. */
export const exportPeople = (
	companyId: string,
	{ status, search, branchId, departmentId }: PeopleQuery
): Promise<DownloadedFile> => {
	const query = new URLSearchParams();
	if (status) query.set("status", status);
	if (search.trim()) query.set("search", search.trim());
	if (branchId) query.set("branchId", branchId);
	if (departmentId) query.set("departmentId", departmentId);
	const suffix = query.size > 0 ? `?${query.toString()}` : "";
	return apiDownload(
		`${companyPath(companyId)}/member-profiles/export${suffix}`,
		"people.xlsx"
	);
};
