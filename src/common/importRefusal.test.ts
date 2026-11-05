import { describe, expect, it } from "vitest";
import { importFileProblem, importRefusalCode } from "@/common/importRefusal";
import { ApiProblemError } from "@/common/problem";

const rules = { extensions: [".xlsx"], maxBytes: 10 };

const problem = (status: number, errorCode?: string): ApiProblemError =>
	new ApiProblemError({
		message: "refused",
		status,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

describe("importFileProblem", () => {
	it("refuses another extension, then a file over the limit, whatever the name's case", () => {
		expect(importFileProblem(new File(["x"], "units.csv"), rules)).toBe(
			"UNSUPPORTED_FILE"
		);
		expect(
			importFileProblem(new File([new Uint8Array(11)], "units.xlsx"), rules)
		).toBe("FILE_TOO_LARGE");
		expect(
			importFileProblem(new File([new Uint8Array(10)], "Units.XLSX"), rules)
		).toBeUndefined();
	});
});

describe("importRefusalCode", () => {
	const codes = ["IMPORT_RUNNING", "FILE_TOO_LARGE", "UNKNOWN"] as const;

	it("keeps a code the import knows", () => {
		expect(importRefusalCode(problem(409, "IMPORT_RUNNING"), codes)).toBe(
			"IMPORT_RUNNING"
		);
	});

	it("falls back by status for a code this import does not know", () => {
		expect(
			importRefusalCode(problem(413, "INVITATIONS_UNAVAILABLE"), codes)
		).toBe("FILE_TOO_LARGE");
		expect(importRefusalCode(problem(429), codes)).toBe("RATE_LIMITED");
		expect(importRefusalCode(problem(400, "SOMETHING_NEW"), codes)).toBe(
			"UNKNOWN"
		);
		expect(importRefusalCode(new Error("offline"), codes)).toBe("UNKNOWN");
	});
});
