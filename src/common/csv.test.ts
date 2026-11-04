import { describe, expect, it } from "vitest";
import { csvCell, toCsvBlob } from "@/common/csv";

describe("csvCell", () => {
	it("quotes every cell and doubles its quotes", () => {
		expect(csvCell('Tan "Ada" Wei')).toBe('"Tan ""Ada"" Wei"');
	});

	it("keeps a value that could start a formula from running", () => {
		expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
		expect(csvCell("+SUM(A1)")).toBe(`"'+SUM(A1)"`);
		expect(csvCell("@sum")).toBe(`"'@sum"`);
	});

	it("keeps a phone number as typed so a fixed file can be uploaded again", () => {
		expect(csvCell("+6591234567")).toBe('"+6591234567"');
	});
});

describe("toCsvBlob", () => {
	it("writes UTF-8 with a byte-order mark and CRLF rows", async () => {
		const blob = toCsvBlob([
			["Name", "Email"],
			["José", "jose@acme.sg"],
		]);
		const bytes = new Uint8Array(await blob.arrayBuffer());

		expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
		await expect(blob.text()).resolves.toBe(
			'"Name","Email"\r\n"José","jose@acme.sg"\r\n'
		);
	});
});
