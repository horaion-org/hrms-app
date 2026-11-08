import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Reads an .xlsx's defined names (the import template's dropdown lists) without a spreadsheet dependency: the file is
 * a zip of XML, read with Python's standard library in isolated mode. Returns each defined name's cell values.
 */
const READ_DEFINED_NAMES = String.raw`
import json, re, sys, zipfile
book = zipfile.ZipFile(sys.argv[1])
strings = [re.sub(r"<[^>]+>", "", item) for item in re.findall(r"<si>(.*?)</si>", book.read("xl/sharedStrings.xml").decode(), re.S)] if "xl/sharedStrings.xml" in book.namelist() else []
workbook = book.read("xl/workbook.xml").decode()
sheets = re.findall(r'<sheet [^>]*name="([^"]+)"', workbook)
def cells(index):
    xml = book.read(f"xl/worksheets/sheet{index + 1}.xml").decode()
    values = {}
    for ref, attrs, body in re.findall(r'<c r="([A-Z]+\d+)"([^>]*)>(.*?)</c>', xml, re.S):
        raw = re.search(r"<v>(.*?)</v>", body, re.S)
        inline = re.search(r"<t[^>]*>(.*?)</t>", body, re.S)
        if 't="s"' in attrs and raw: values[ref] = strings[int(raw.group(1))]
        elif inline: values[ref] = inline.group(1)
        elif raw: values[ref] = raw.group(1)
    return values
def expand(start, end):
    (c1, r1), (c2, r2) = [re.match(r"\$?([A-Z]+)\$?(\d+)", part).groups() for part in (start, end)]
    cols = [chr(code) for code in range(ord(c1), ord(c2) + 1)]
    return [f"{col}{row}" for row in range(int(r1), int(r2) + 1) for col in cols]
result = {}
for name, target in re.findall(r'<definedName name="([^"]+)"[^>]*>([^<]*)</definedName>', workbook):
    if "!" not in target or name.startswith("_xlnm"): continue
    sheet, area = target.split("!")
    parts = area.split(":")
    refs = expand(parts[0], parts[-1])
    values = cells(sheets.index(sheet.strip("'")))
    result[name] = [values.get(ref, "") for ref in refs]
def header_of(index):
    rows = {}
    for ref, value in cells(index).items():
        column, row = re.match(r"([A-Z]+)(\d+)", ref).groups()
        rows.setdefault(int(row), []).append((len(column), column, value.rstrip(" *")))
    found = next((row for row in sorted(rows) if {"Name", "Email"} <= {value for _, _, value in rows[row]}), None)
    return [value for _, _, value in sorted(rows[found])] if found else []
result["__header__"] = next((header for header in map(header_of, range(len(sheets))) if header), [])
print(json.dumps(result))
`;

/** The defined names, plus `__header__`: the column headers (the first row, on any sheet, holding Name and Email; a required field's " *" dropped). */
export function readDefinedNames(xlsx: Buffer): Record<string, string[]> {
	const directory = mkdtempSync(join(tmpdir(), "e2e-xlsx-"));
	const file = join(directory, "book.xlsx");
	writeFileSync(file, xlsx);
	return JSON.parse(execFileSync("python3", ["-I", "-c", READ_DEFINED_NAMES, file], { encoding: "utf8" })) as Record<string, string[]>;
}
