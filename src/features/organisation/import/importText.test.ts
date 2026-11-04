import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import { ApiProblemError } from "@/common/problem";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	checkedRowFixture,
	checkFixture,
	organisationImportFixture,
} from "@/features/organisation/import/fixtures";
import {
	checkHeadline,
	clientFileProblem,
	errorRowsCsv,
	firstSheetToShow,
	problemText,
	refusalCode,
	resultRowsCsv,
	sheetSummaries,
	unitCountsText,
} from "@/features/organisation/import/importText";

const t = authTestI18n.t as TFunction;

const headNotMember = checkedRowFixture({
	sheet: "DEPARTMENTS",
	row: 7,
	status: "ERROR",
	values: { BRANCH: "JUR", NAME: "Patrol", HEADS: "lim@acme.sg" },
	problems: [{ column: "HEADS", code: "HEAD_NOT_MEMBER", severity: "ERROR" }],
});

describe("sheetSummaries and firstSheetToShow", () => {
	it("counts each sheet's rows and errors, and opens the first sheet with an error", () => {
		const rows = [...checkFixture().rows, headNotMember];

		const summaries = sheetSummaries(rows);

		expect(summaries).toEqual([
			{ sheet: "BRANCHES", rowCount: 1, errorCount: 0 },
			{ sheet: "DEPARTMENTS", rowCount: 2, errorCount: 1 },
			{ sheet: "JOB_TITLES", rowCount: 1, errorCount: 0 },
		]);
		expect(firstSheetToShow(summaries)).toBe("DEPARTMENTS");
	});

	it("opens the first sheet with rows when nothing needs fixing", () => {
		const onlyJobTitles = checkFixture().rows.filter(
			(row) => row.sheet === "JOB_TITLES"
		);

		expect(firstSheetToShow(sheetSummaries(onlyJobTitles))).toBe("JOB_TITLES");
		expect(firstSheetToShow(sheetSummaries([]))).toBe("BRANCHES");
	});
});

describe("unitCountsText", () => {
	it("names each kind with a count, leaving out kinds with none", () => {
		expect(
			unitCountsText({ branches: 4, departments: 0, jobTitles: 1 }, t)
		).toBe("4 branches · 1 job title");
		expect(unitCountsText({ branches: 3, departments: 15 }, t)).toBe(
			"3 branches · 15 departments"
		);
		expect(
			unitCountsText({ branches: 0, departments: 0, jobTitles: 0 }, t)
		).toBe("nothing");
	});
});

describe("checkHeadline", () => {
	it("says what blocks the import, that it is ready, or that it has nothing to create", () => {
		expect(checkHeadline(checkFixture({ errorRows: 2 }), t)).toBe(
			"2 rows need fixing before anything is created."
		);
		expect(checkHeadline(checkFixture(), t)).toBe("Your file is ready.");
		expect(
			checkHeadline(
				checkFixture({
					toCreate: { branches: 0, departments: 0, jobTitles: 0 },
				}),
				t
			)
		).toBe(
			"Everything in this file already exists, so there is nothing to create."
		);
	});
});

describe("problemText", () => {
	it("words a known code with its column, and keeps an unknown code's name", () => {
		expect(
			problemText({ column: "NAME", code: "REQUIRED", severity: "ERROR" }, t)
		).toBe("Name is required.");
		expect(
			problemText({ column: null, code: "SOMETHING_NEW", severity: "ERROR" }, t)
		).toBe("SOMETHING_NEW");
	});
});

describe("errorRowsCsv", () => {
	it("lists only the rows to fix, with their sheet, row and every template column", () => {
		const csv = errorRowsCsv([...checkFixture().rows, headNotMember], t);

		expect(csv[0]).toEqual([
			"Sheet",
			"Row",
			"Code",
			"Name",
			"City",
			"Country",
			"Time zone",
			"Heads",
			"Branch",
			"Department",
			"Description",
			"Errors",
		]);
		expect(csv.slice(1)).toEqual([
			[
				"Departments",
				"7",
				"",
				"Patrol",
				"",
				"",
				"",
				"lim@acme.sg",
				"JUR",
				"",
				"",
				"No one in this company has this email. Leave Heads blank to be head yourself for now.",
			],
		]);
	});
});

describe("resultRowsCsv", () => {
	it("gives one line per row of the import", () => {
		expect(resultRowsCsv(organisationImportFixture(), t)).toEqual([
			["Sheet", "Row", "Result"],
			["Branches", "3", "Created"],
			["Departments", "3", "Created"],
			["Job titles", "3", "Created"],
		]);
	});
});

describe("clientFileProblem and refusalCode", () => {
	it("refuses anything but an Excel workbook, and files over 2 MB, before uploading", () => {
		expect(clientFileProblem(new File(["a"], "structure.csv"))).toBe(
			"UNSUPPORTED_FILE"
		);
		expect(
			clientFileProblem(
				new File([new Uint8Array(2 * 1024 * 1024 + 1)], "structure.xlsx")
			)
		).toBe("FILE_TOO_LARGE");
		expect(
			clientFileProblem(new File(["a"], "Structure.XLSX"))
		).toBeUndefined();
	});

	it("keeps the API's code when the copy knows it, and falls back by status", () => {
		const refusal = (status: number, errorCode?: string): ApiProblemError =>
			new ApiProblemError({
				message: "refused",
				status,
				errorCode,
				fieldErrors: [],
				reason: "http",
			});

		expect(refusalCode(refusal(409, "IMPORT_RUNNING"))).toBe("IMPORT_RUNNING");
		expect(refusalCode(refusal(413))).toBe("FILE_TOO_LARGE");
		expect(refusalCode(refusal(429))).toBe("RATE_LIMITED");
		expect(refusalCode(new Error("offline"))).toBe("UNKNOWN");
	});
});
