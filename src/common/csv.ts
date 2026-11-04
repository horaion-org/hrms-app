/**
 * A start that makes a spreadsheet read a cell as a formula (OWASP CSV
 * injection). A plus or minus followed only by digits is a phone number or a
 * negative number, which a re-uploaded file must keep as typed.
 */
const FORMULA_START = /^[=@\t\r]|^[+-](?![\d\s]*$)/;

/**
 * One CSV cell: a value that could start a formula gets a leading `'`, and
 * every cell is quoted with its quotes doubled.
 */
export const csvCell = (value: string): string => {
	const safe = FORMULA_START.test(value) ? `'${value}` : value;
	return `"${safe.replace(/"/g, '""')}"`;
};

/**
 * Rows as UTF-8 CSV with a byte-order mark, so Excel opens names with
 * accents correctly; rows end with CRLF, as Excel writes them.
 */
export const toCsvBlob = (rows: ReadonlyArray<ReadonlyArray<string>>): Blob =>
	new Blob(
		[`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`],
		{ type: "text/csv;charset=utf-8" }
	);
