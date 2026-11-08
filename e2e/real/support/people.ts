import { ApiClient, expectStatus, rowsOf } from "./api";

/** Finds a company member by login email (lists are eventually consistent right after an import). */
export async function findMember(api: ApiClient, email: string): Promise<any> {
	for (let attempt = 0; attempt < 10; attempt++) {
		const rows = rowsOf(expectStatus(await api.get("~/member-profiles?page=0&size=100"), 200, "member profiles"));
		const match = rows.find((row: any) => row.email?.toLowerCase() === email.toLowerCase());
		if (match) return match;
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
	throw new Error(`no member profile for ${email}`);
}

export function importCsv(rows: { name: string; email: string; branch: string; departmentName: string; jobTitle: string }[]): string {
	return [
		"Name,Email,Branch,Department,Job title,Employment type,Hire date",
		...rows.map((row) => [row.name, row.email, row.branch, row.departmentName, row.jobTitle, "Full-time", "2026-01-05"].join(",")),
	].join("\n");
}

export type CodedImportRow = { name: string; email: string; branch: string; departmentName: string; jobTitle: string; employeeCode: string; employmentTerms: string };

/** The template's two newer columns: `Employment terms` (blank = the company default) and `Employee code`. */
export function importCsvWithCodes(rows: CodedImportRow[]): string {
	return [
		"Name,Email,Branch,Department,Job title,Employment type,Hire date,Employment terms,Employee code",
		...rows.map((row) => [row.name, row.email, row.branch, row.departmentName, row.jobTitle, "Full-time", "2026-01-05", row.employmentTerms, row.employeeCode].join(",")),
	].join("\n");
}

/** Checks a file without importing it: the row statuses and counts the wizard's check step shows. */
export async function checkImport(api: ApiClient, csv: string): Promise<any> {
	const form = new FormData();
	form.append("file", new Blob([csv], { type: "text/csv" }), "people.csv");
	return expectStatus(await api.upload("~/member-imports/checks", form), 200, "import check");
}

/** Starts a member import without invitations and waits for it to finish. */
export async function runImport(api: ApiClient, csv: string): Promise<any> {
	const form = new FormData();
	form.append("file", new Blob([csv], { type: "text/csv" }), "people.csv");
	form.append("sendInvitations", "false");
	form.append("skipInvalid", "false");
	const started = await api.upload("~/member-imports", form);
	if (started.status >= 300) throw new Error(`import: ${started.status} ${started.text.slice(0, 600)}`);
	const importId = started.data.importId;
	for (let attempt = 0; attempt < 120; attempt++) {
		const job = expectStatus(await api.get(`~/member-imports/${importId}`), 200, "import status");
		if (!["QUEUED", "RUNNING", "PENDING", "IN_PROGRESS"].includes(job.status)) return job;
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
	throw new Error("import did not finish");
}
