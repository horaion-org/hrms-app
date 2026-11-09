import { readFileSync, writeFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { ApiClient, expectStatus, rowsOf } from "./support/api";
import { readAccounts, RUN_DIRECTORY } from "./support/environment";
import { checkImport, type CodedImportRow, findMember, importCsvWithCodes, runImport } from "./support/people";
import { readSeed, recordCreatedIdentity } from "./support/seed-data";
import { readDefinedNames } from "./support/spreadsheet";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Import follow-ups 2 (backend #160, app #111): the template's `Employment terms` and `Employee code` columns; a
 * re-upload with someone's code and a new email corrects their login instead of adding them again (closes KNOWN-1).
 * The code is the one the company assigned (EMP-…): a new person's row leaves it blank, so the correction reads
 * Cara's code back first;
 * blank terms mean the Default; "Invite everyone (N)" within and over the daily limit (the e2e backend runs with
 * MEMBER_IMPORT_INVITATIONS_PER_DAY=3); the People `Invited` badge, Filters › Signed in, the export filter; Spanish.
 */

const seed = readSeed();
const accounts = readAccounts();
const stamp = Date.now().toString(36);
const PART_TIME = "Part-time 3 days";
const person = (key: string, name: string, terms: string): CodedImportRow => ({
	name,
	email: `e2e+${key}-${stamp}@horaion.com`,
	branch: "CEN",
	departmentName: "Operations",
	jobTitle: "Security Officer",
	employeeCode: "",
	employmentTerms: terms,
});
const cara = person("c1", "Cara Code", "");
const dev = person("c2", "Dev Code", PART_TIME);
const caraCorrected = { ...cara, email: `e2e+c1b-${stamp}@horaion.com` };
/** Set once Cara is imported: her assigned employee code goes on the correcting row. */
const correctingRow = (employeeCode: string): CodedImportRow => ({ ...caraCorrected, employeeCode });
const extras = [person("c3", "Eve Extra", ""), person("c4", "Fay Extra", "")];
const state: { firstImportId?: string; extrasImportId?: string } = {};
/** What the invite and the limit answered; E2E-009 judges it last, so a failure there does not skip E2E-017 to E2E-019. */
const seen: { inviteToast?: string; inviteAlert?: string; limitAnswer?: string } = {};
/** The few Spanish strings E2E-019 looks for, read from the app's own locale file. */
type SpanishCopy = {
	people: { importPage: { result: { invite_other: string } }; invitationFilter: { label: string }; profile: { invited: string } };
};
const signIn = async () => (await ApiClient.signIn(accounts.emails.admin, accounts.password)).withCompany(seed.companyId);

/** Uploads a file through the wizard (Settings › Data › Import people) and stops at the check step. */
async function uploadThroughWizard(page: import("@playwright/test").Page, csv: string, name: string): Promise<void> {
	const file = `${RUN_DIRECTORY}/run/${name}.csv`;
	writeFileSync(file, csv);
	await page.goto("/settings/data/import-people");
	await settle(page);
	await page.getByRole("button", { name: "I have a file" }).click();
	await page.locator('input[type="file"]').setInputFiles(file);
	await settle(page);
}

/** Confirms the import from the check step and waits for the result panel. */
async function importFromCheck(page: import("@playwright/test").Page, buttonName: RegExp): Promise<void> {
	await page.getByRole("button", { name: buttonName }).click();
	const confirm = page.getByRole("dialog");
	await confirm.getByRole("button", { name: /^Import|^Correct|^Update/ }).last().click();
	await expect(page.getByRole("heading", { name: /import/i }).first()).toBeVisible();
	await settle(page);
}

test.describe.configure({ mode: "serial" });

test("E2E-013 the template has an Employment terms dropdown and an Employee code column", async ({}, testInfo) => {
	const admin = await signIn();
	const template = await admin.download("~/member-imports/template");
	writeFileSync(`${RUN_DIRECTORY}/screens/E2E-013-people-import-template.xlsx`, template.bytes);
	const lists = readDefinedNames(template.bytes);
	const header = lists["__header__"] ?? [];
	const terms = (lists["TermsNames"] ?? []).filter(Boolean);
	actual(testInfo, `header: ${header.join(" | ")}; TermsNames: ${terms.join(" | ")}`);
	expect(template.status).toBe(200);
	expect(header).toContain("Employment terms");
	expect(header).toContain("Employee code");
	expect(terms).toContain(PART_TIME);
});

test("E2E-014 imported with codes; a re-upload with the same code and a new email corrects the login, no second person (KNOWN-1)", async ({ browser }, testInfo) => {
	const admin = await signIn();
	const page = await openAs(browser, "admin");
	await uploadThroughWizard(page, importCsvWithCodes([cara, dev]), `import-codes-${stamp}`);
	await screen(page, testInfo, "E2E-014", "1-checked-with-codes");
	await importFromCheck(page, /^Import 2 people/);
	[cara, dev].forEach((row) => recordCreatedIdentity(row.email));
	await expect(page.getByText(/2 added/).first()).toBeVisible({ timeout: 60_000 });
	await screen(page, testInfo, "E2E-014", "2-imported");
	const before = await findMember(admin, cara.email);
	const rowsBefore = rowsOf((await admin.get("~/member-profiles?page=0&size=200")).data);
	const countBefore = rowsBefore.length;
	const carasBefore = rowsBefore.filter((row: any) => row.displayName === cara.name).length;
	const correcting = importCsvWithCodes([correctingRow(before.employeeCode)]);

	const check = await checkImport(admin, correcting);
	await uploadThroughWizard(page, correcting, `import-correct-${stamp}`);
	const marked = await page.getByText("Corrects their email").count();
	const summary = await page.getByText("1 row corrects the email of someone already in the company.").count();
	await screen(page, testInfo, "E2E-014", "3-check-corrects-email");
	const importButton = page.getByRole("button", { name: /^Import|^Correct/ }).first();
	const buttonText = (await importButton.innerText()).trim();
	await importButton.click();
	const confirm = page.getByRole("dialog");
	if (await confirm.count()) {
		await screen(page, testInfo, "E2E-014", "4-confirm");
		await confirm.getByRole("button").last().click();
	}
	recordCreatedIdentity(caraCorrected.email);
	await expect(page.getByText("1 email corrected").first()).toBeVisible({ timeout: 60_000 });
	await screen(page, testInfo, "E2E-014", "5-result-email-corrected");

	const after = await findMember(admin, caraCorrected.email);
	const rows = rowsOf((await admin.get("~/member-profiles?page=0&size=200")).data);
	const oldEmailLeft = rows.filter((row: any) => row.email?.toLowerCase() === cara.email.toLowerCase()).length;
	const caras = rows.filter((row: any) => row.displayName === cara.name).length;
	const statuses = (check.rows ?? []).map((row: any) => row.status).join(",");
	actual(
		testInfo,
		`Cara's assigned code ${before.employeeCode}; check: rows ${statuses}, correctionRows=${check.correctionRows}, ready=${check.readyRows}; UI "Corrects their email" ${marked}, summary ${summary}, button "${buttonText}"; members ${countBefore} → ${rows.length}; same membership: ${after.membershipId === before.membershipId}; old email rows ${oldEmailLeft}; "${cara.name}" rows ${carasBefore} → ${caras}`
	);
	expect(statuses).toContain("CORRECT_EMAIL");
	expect(check.correctionRows).toBe(1);
	expect(marked).toBeGreaterThan(0);
	expect(summary).toBe(1);
	expect(after.membershipId).toBe(before.membershipId);
	expect(rows.length).toBe(countBefore);
	expect(oldEmailLeft).toBe(0);
	expect(caras).toBe(carasBefore);
});

test("E2E-015 blank employment terms give the Default; a named one gives those terms", async ({}, testInfo) => {
	const admin = await signIn();
	const termsOf = async (email: string) => {
		const member = await findMember(admin, email);
		const terms = expectStatus(await admin.get(`~/member-profiles/${member.membershipId}/employment-terms`), 200, "member terms");
		return { inForce: terms.inForce?.termsId as string | undefined, history: (terms.history ?? []).map((entry: any) => entry.termsId as string) };
	};
	const companyTerms = expectStatus(await admin.get("~/employment-terms"), 200, "company terms").terms ?? [];
	const defaultTerms = companyTerms.find((terms: any) => terms.isDefault)?.id;
	const caraTerms = await termsOf(caraCorrected.email);
	const devTerms = await termsOf(dev.email);
	actual(testInfo, `Cara (blank) → in force ${caraTerms.inForce}, history ${caraTerms.history.join(",")} (Default ${defaultTerms}); Dev ("${PART_TIME}") → in force ${devTerms.inForce}, history ${devTerms.history.join(",")} (part-time ${seed.termsIds.partTime})`);
	expect(caraTerms.inForce).toBe(defaultTerms);
	expect(caraTerms.history).toEqual([defaultTerms]);
	expect(devTerms.inForce).toBe(seed.termsIds.partTime);
	expect(devTerms.history).toEqual([seed.termsIds.partTime]);
});

test("E2E-016 Invite everyone (N) names the people and today's remaining emails, and sends", async ({ browser }, testInfo) => {
	const admin = await signIn();
	const jobs = rowsOf((await admin.get("~/member-imports")).data);
	// The newest import that added both coded people (the history lists newest first).
	state.firstImportId = jobs.find((job: any) => job.addedRows === 2)?.importId;
	const detail = expectStatus(await admin.get(`~/member-imports/${state.firstImportId}`), 200, "import detail");
	const page = await openAs(browser, "admin");
	await page.goto(`/settings/data/import-people?import=${state.firstImportId}`);
	await settle(page);
	const invite = page.getByRole("button", { name: /^Invite everyone \(\d+\)|^Invite \d+ person/ });
	await screen(page, testInfo, "E2E-016", "1-result-invite-button");
	const label = (await invite.count()) ? (await invite.first().innerText()).trim() : "(no invite button)";
	await invite.first().click();
	const confirm = page.getByRole("dialog");
	const confirmText = (await confirm.innerText()).replace(/\s+/g, " ");
	await screen(page, testInfo, "E2E-016", "2-invite-confirm");
	await confirm.getByRole("button", { name: "Send invitations" }).click();
	const toast = page.getByText(/^Invitations sent:/);
	const alert = confirm.getByRole("alert");
	await expect(toast.first().or(alert.first())).toBeVisible({ timeout: 30_000 });
	const toastText = (await toast.count()) ? (await toast.first().innerText()).trim() : "(no toast)";
	seen.inviteToast = toastText;
	seen.inviteAlert = (await alert.count()) ? (await alert.first().innerText()).trim() : "";
	await screen(page, testInfo, "E2E-016", "3-after-send");
	actual(testInfo, `import invitablePeople=${detail.invitablePeople}, invitationsLeftToday=${detail.invitationsLeftToday}; button "${label}"; confirm "${confirmText.slice(0, 220)}"; after Send: toast "${toastText}", dialog alert "${seen.inviteAlert}"`);
	expect(label).toBe("Invite everyone (2)");
	expect(confirmText).toContain("3 invitation emails can still be sent today.");
});

test("E2E-017 over the daily limit the confirm says how many are left and blocks sending", async ({ browser }, testInfo) => {
	const admin = await signIn();
	const job = await runImport(admin, importCsvWithCodes(extras));
	extras.forEach((row) => recordCreatedIdentity(row.email));
	state.extrasImportId = job.importId;
	const detail = expectStatus(await admin.get(`~/member-imports/${job.importId}`), 200, "import detail");
	const page = await openAs(browser, "admin");
	await page.goto(`/settings/data/import-people?import=${job.importId}`);
	await settle(page);
	const invite = page.getByRole("button", { name: /^Invite everyone \(\d+\)/ });
	let confirmText = "(no invite button)";
	let sendEnabled: boolean | undefined;
	if (await invite.count()) {
		await invite.first().click();
		const confirm = page.getByRole("dialog");
		confirmText = (await confirm.innerText()).replace(/\s+/g, " ");
		const send = confirm.getByRole("button", { name: "Send invitations" });
		sendEnabled = (await send.count()) ? await send.isEnabled() : false;
		await screen(page, testInfo, "E2E-017", "1-invite-over-limit");
	}
	const refused = await admin.post(`~/member-imports/${job.importId}/invitations`);
	seen.limitAnswer = `${refused.status} ${refused.errorCode ?? ""}`;
	actual(testInfo, `extras import: invitable ${detail.invitablePeople}, left today ${detail.invitationsLeftToday}; confirm "${confirmText.slice(0, 220)}", Send enabled: ${sendEnabled}; API → ${seen.limitAnswer}`);
	expect(detail.invitationsLeftToday).toBe(1);
	expect(confirmText).toContain("Only 1 invitation emails can be sent today.");
	expect(sendEnabled).not.toBe(true);
});

test("E2E-018 People: Invited badge, Filters › Signed in, and the export honours the filter", async ({ browser }, testInfo) => {
	const admin = await signIn();
	const all = rowsOf((await admin.get("~/member-profiles?page=0&size=200")).data);
	const pending = rowsOf((await admin.get("~/member-profiles?page=0&size=200&invitationPending=true")).data);
	const accepted = rowsOf((await admin.get("~/member-profiles?page=0&size=200&invitationPending=false")).data);
	const exportAccepted = await admin.download("~/member-profiles/export?invitationPending=false");
	const exportAll = await admin.download("~/member-profiles/export");
	writeFileSync(`${RUN_DIRECTORY}/screens/E2E-018-export-signed-in.xlsx`, exportAccepted.bytes);
	const exportText = (bytes: Buffer) => bytes.toString("latin1");
	const roleEmails = Object.values(accounts.emails).filter((email) => email !== accounts.emails.ownerB);
	const acceptedEmails = accepted.map((row: any) => row.email);

	const page = await openAs(browser, "admin");
	await page.goto("/people");
	await settle(page);
	const badges = await page.getByText("Invited", { exact: true }).count();
	await screen(page, testInfo, "E2E-018", "1-people-invited-badges");
	await page.getByRole("button", { name: /^Filters/ }).click();
	await settle(page);
	await screen(page, testInfo, "E2E-018", "2-filters-open");
	await page.getByRole("combobox", { name: "Signed in" }).or(page.getByLabel("Signed in")).first().click();
	await page.getByRole("option", { name: "Yes" }).click();
	await settle(page);
	await page.keyboard.press("Escape");
	await settle(page);
	const url = page.url();
	await screen(page, testInfo, "E2E-018", "3-filter-signed-in-yes");
	const visibleInvited = await page.getByRole("main").getByText("Invited", { exact: true }).count();
	actual(
		testInfo,
		`members ${all.length}: pending ${pending.length}, signed in ${accepted.length} (${acceptedEmails.join(" ")}); UI Invited badges ${badges}; filter URL ${url.replace(/^.*\/people/, "/people")}, Invited badges after "Yes": ${visibleInvited}; export signed-in ${exportAccepted.status} ${exportAccepted.bytes.length} B vs all ${exportAll.bytes.length} B`
	);
	expect(pending.length + accepted.length).toBe(all.length);
	expect(pending.every((row: any) => row.invitationPending === true)).toBe(true);
	expect(acceptedEmails.every((email: string) => roleEmails.includes(email))).toBe(true);
	expect(badges).toBeGreaterThan(0);
	expect(url).toContain("invitation=accepted");
	expect(visibleInvited).toBe(0);
	expect(exportAccepted.status).toBe(200);
	expect(exportAccepted.bytes.length).toBeLessThan(exportAll.bytes.length);
	expect(exportText(exportAccepted.bytes).includes(caraCorrected.email)).toBe(false);
});

test("E2E-019 Spanish: the import check, result and the People Signed in filter read in Spanish", async ({ browser }, testInfo) => {
	const es = JSON.parse(readFileSync("src/assets/locales/es/translations.json", "utf8")) as SpanishCopy;
	const page = await openAs(browser, "admin", undefined, "es-ES");
	// The saved sign-in state carries the detector's cached "en"; a Spanish user's browser holds "es" there (as E2E-110).
	await page.addInitScript(() => window.localStorage.setItem("i18nextLng", "es"));
	await page.goto(`/settings/data/import-people?import=${state.extrasImportId}`);
	await settle(page);
	await screen(page, testInfo, "E2E-019", "1-import-result-es");
	const inviteSpanish = es.people.importPage.result.invite_other.replace("{{count}}", "2");
	const inviteShown = await page.getByRole("button", { name: inviteSpanish }).count();
	await page.goto("/people");
	await settle(page);
	await page.getByRole("button", { name: /^Filtros|^Filters/ }).click();
	await settle(page);
	await screen(page, testInfo, "E2E-019", "2-people-filters-es");
	const filterLabel = es.people.invitationFilter.label;
	const filterShown = await page.getByText(filterLabel, { exact: true }).count();
	const invitedBadge = await page.getByText(es.people.profile.invited, { exact: true }).count();
	const englishLeft = await page.getByText(/^(Signed in|Not yet \(invited\)|Invite everyone)/).count();
	actual(testInfo, `"${inviteSpanish}" button ${inviteShown}; "${filterLabel}" filter ${filterShown}; "${es.people.profile.invited}" badges ${invitedBadge}; English leftovers ${englishLeft}`);
	expect(inviteShown).toBe(1);
	expect(filterShown).toBeGreaterThan(0);
	expect(englishLeft).toBe(0);
});

test("E2E-009 the invite reports sent / skipped / failed, and over the limit answers 429 INVITATION_LIMIT_EXCEEDED", async ({}, testInfo) => {
	actual(testInfo, `E2E-016 after Send: toast "${seen.inviteToast}", dialog alert "${seen.inviteAlert}"; E2E-017 over the limit → ${seen.limitAnswer}`);
	expect.soft(seen.limitAnswer).toBe("429 INVITATION_LIMIT_EXCEEDED");
	expect(seen.inviteToast ?? "").toMatch(/Invitations sent: 2 · 0 skipped .* 0 failed/);
});
