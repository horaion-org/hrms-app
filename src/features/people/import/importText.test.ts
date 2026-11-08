import i18next, { type TFunction } from "i18next";
import { describe, expect, it } from "vitest";
import "@/common/i18n";
import { ApiProblemError } from "@/common/problem";
import type {
	CheckedRow,
	MemberImport,
	RowOutcome,
} from "@/features/people/import/api";
import {
	clientFileProblem,
	errorRowsCsv,
	problemGroups,
	problemText,
	refusalCode,
	resolvedText,
	resultRowsCsv,
} from "@/features/people/import/importText";

// Echoes the key and its column, so assertions read what was asked for.
const t = ((key: string, ...rest: Array<unknown>) => {
	const options = rest.find(
		(part): part is { column?: string } =>
			typeof part === "object" && part !== null
	);
	return options?.column ? `${key}(${options.column})` : key;
}) as unknown as TFunction;

const row = (
	number: number,
	status: CheckedRow["status"],
	problems: CheckedRow["problems"]
): CheckedRow => ({
	row: number,
	status,
	values: {
		NAME: `Person ${String(number)}`,
		EMAIL: `p${String(number)}@acme.sg`,
	},
	problems,
});

describe("problemGroups", () => {
	it("groups by problem and column, errors first, then the most frequent", () => {
		const groups = problemGroups([
			row(2, "SKIP", [
				{ column: "EMAIL", code: "ALREADY_MEMBER", severity: "SKIP" },
			]),
			row(3, "ERROR", [
				{ column: "PHONE", code: "INVALID_PHONE", severity: "ERROR" },
			]),
			row(4, "ERROR", [
				{
					column: "DEPARTMENT",
					code: "DEPARTMENT_NOT_FOUND",
					severity: "ERROR",
				},
			]),
			row(5, "ERROR", [
				{
					column: "DEPARTMENT",
					code: "DEPARTMENT_NOT_FOUND",
					severity: "ERROR",
				},
			]),
		]);

		expect(
			groups.map((group) => [group.problem.code, group.rowNumbers])
		).toEqual([
			["DEPARTMENT_NOT_FOUND", [4, 5]],
			["INVALID_PHONE", [3]],
			["ALREADY_MEMBER", [2]],
		]);
	});
});

describe("errorRowsCsv", () => {
	it("keeps the template's English headers and only the rows to fix, with their problems last", () => {
		const csv = errorRowsCsv(
			[
				row(2, "READY", []),
				row(3, "ERROR", [
					{ column: "PHONE", code: "INVALID_PHONE", severity: "ERROR" },
				]),
			],
			t
		);

		expect(csv[0]?.slice(0, 2)).toEqual(["Name", "Email"]);
		expect(csv[0]).toContain("Employment terms");
		expect(csv[0]).toContain("Employee code");
		expect(csv).toHaveLength(2);
		expect(csv[1]?.[0]).toBe("Person 3");
		expect(csv[1]?.[csv[1].length - 1]).toContain("INVALID_PHONE");
	});
});

describe("resultRowsCsv", () => {
	it("writes one line per processed row", () => {
		const memberImport = {
			rows: [
				{ rowNumber: 2, result: "ADDED", code: null, membershipId: "m-1" },
				{
					rowNumber: 3,
					result: "FAILED_ACCOUNT",
					code: "EMAIL_ALREADY_REGISTERED",
					membershipId: null,
				},
			],
		} as unknown as MemberImport;

		expect(resultRowsCsv(memberImport, t, "en").slice(1)).toEqual([
			["2", "", "", "people.importPage.results.ADDED", ""],
			[
				"3",
				"",
				"",
				"people.importPage.results.FAILED_ACCOUNT",
				"people.importPage.details.EMAIL_ALREADY_REGISTERED",
			],
		]);
	});

	it("names a row not added and says when its person was added since", () => {
		const memberImport = {
			rows: [
				{
					rowNumber: 4,
					result: "SKIPPED_INVALID",
					code: "INVALID_PHONE",
					membershipId: null,
					name: "Siti",
					email: "siti@acme.sg",
					resolved: true,
					resolvedMembershipId: "m-4",
					resolvedAt: "2026-11-05T09:00:00Z",
				},
			],
		} as unknown as MemberImport;

		expect(resultRowsCsv(memberImport, t, "en")[1]).toEqual([
			"4",
			"Siti",
			"siti@acme.sg",
			"people.importPage.result.resolved",
			"people.importPage.problems.INVALID_PHONE(people.importPage.result.someColumn)",
		]);
	});
});

describe("resolvedText", () => {
	it("dates a row added since only when the reader may open that member", () => {
		const row = (resolvedAt: string | null): RowOutcome => ({
			rowNumber: 4,
			result: "FAILED_ACCOUNT",
			code: null,
			membershipId: null,
			name: "Siti",
			email: "siti@acme.sg",
			resolved: true,
			resolvedMembershipId: null,
			resolvedAt,
		});

		expect(resolvedText(row("2026-11-05T09:00:00Z"), t, "en")).toBe(
			"people.importPage.result.resolved"
		);
		expect(resolvedText(row(null), t, "en")).toBe(
			"people.importPage.result.resolvedUndated"
		);
		expect(
			resolvedText({ ...row(null), resolved: false }, t, "en")
		).toBeUndefined();
	});
});

describe("clientFileProblem", () => {
	it("refuses other file types and files over 2 MB before uploading", () => {
		expect(clientFileProblem(new File(["x"], "people.xls"))).toBe(
			"UNSUPPORTED_FILE"
		);
		expect(
			clientFileProblem(
				new File([new Uint8Array(2 * 1024 * 1024 + 1)], "people.csv")
			)
		).toBe("FILE_TOO_LARGE");
		expect(clientFileProblem(new File(["x"], "People.XLSX"))).toBeUndefined();
	});
});

describe("refusalCode", () => {
	it("keeps the API's code for a known refusal and falls back by status", () => {
		const problem = (status: number, errorCode?: string): ApiProblemError =>
			new ApiProblemError({
				message: "refused",
				status,
				errorCode,
				fieldErrors: [],
				reason: "http",
			});

		expect(refusalCode(problem(409, "IMPORT_RUNNING"))).toBe("IMPORT_RUNNING");
		expect(refusalCode(problem(422, "IMPORT_MOSTLY_INVALID"))).toBe(
			"IMPORT_MOSTLY_INVALID"
		);
		expect(refusalCode(problem(429))).toBe("RATE_LIMITED");
		expect(refusalCode(problem(413))).toBe("FILE_TOO_LARGE");
		expect(refusalCode(new Error("x"))).toBe("UNKNOWN");
	});
});

describe("problemText", () => {
	it("words the formula problems in English and Spanish", () => {
		const en = i18next.getFixedT("en");
		const es = i18next.getFixedT("es");

		expect(
			problemText(
				{ column: "NAME", code: "FORMULA_WITHOUT_VALUE", severity: "ERROR" },
				en
			)
		).toBe(
			"This cell has a formula without a stored value. Open the file in Excel, save it, and upload again."
		);
		expect(
			problemText(
				{ column: "DEPARTMENT", code: "CELL_ERROR", severity: "ERROR" },
				es
			)
		).toBe(
			"Esta celda muestra un error (como #REF!). Corrige la fórmula en Excel y vuelve a subirlo."
		);
	});
});
