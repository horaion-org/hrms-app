import { writeFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { ApiClient, rowsOf } from "./support/api";
import { readAccounts, RUN_DIRECTORY } from "./support/environment";
import { findMember, importCsv } from "./support/people";
import { recordCreatedIdentity, readSeed } from "./support/seed-data";
import { readDefinedNames } from "./support/spreadsheet";
import { actual, openAs, screen, settle } from "./support/ui";

/** Flow 2: People import — template lists, upload through the wizard, identity Invited, resend; a re-upload without a code. */

const seed = readSeed();
const accounts = readAccounts();
const stamp = Date.now().toString(36);
const firstImported = { name: "Ivy Import", email: `e2e+imp1-${stamp}@horaion.com`, branch: "CEN", departmentName: "Operations", jobTitle: "Security Officer" };
const secondImported = { name: "Ike Import", email: `e2e+imp2-${stamp}@horaion.com`, branch: "CEN", departmentName: "Support", jobTitle: "Support Agent" };
const imported = [firstImported, secondImported];

test.describe.configure({ mode: "serial" });

test("E2E-010 the template's dropdown lists match the company's branches, departments and job titles", async ({}, testInfo) => {
	const admin = (await ApiClient.signIn(accounts.emails.admin, accounts.password)).withCompany(seed.companyId);
	const template = await admin.download("~/member-imports/template");
	expect(template.status).toBe(200);
	writeFileSync(`${RUN_DIRECTORY}/screens/E2E-010-people-import-template.xlsx`, template.bytes);
	const lists = readDefinedNames(template.bytes);
	const departments = (lists["DeptNames"] ?? []).filter(Boolean).sort();
	const jobTitles = (lists["JobTitleNames"] ?? []).filter(Boolean).sort();
	actual(testInfo, `BranchNames=${(lists["BranchNames"] ?? []).join("|")}; DeptNames=${departments.join("|")}; JobTitleNames=${jobTitles.join("|")}`);
	expect((lists["BranchNames"] ?? []).filter(Boolean).join("|")).toMatch(/Central|CEN/);
	expect(departments).toEqual(["Operations", "Support"]);
	expect(jobTitles).toEqual(["Security Officer", "Support Agent", "Supervisor"].sort());
});

test("E2E-011 upload through the wizard: people Active, identity Invited, no invitation sent, Resend visible", async ({ browser }, testInfo) => {
	const file = `${RUN_DIRECTORY}/run/import-${stamp}.csv`;
	writeFileSync(file, importCsv(imported));
	const page = await openAs(browser, "admin");
	await page.goto("/settings/data/import-people");
	await settle(page);
	await screen(page, testInfo, "E2E-011", "1-template-step");
	await page.getByRole("button", { name: "I have a file" }).click();
	await page.locator('input[type="file"]').setInputFiles(file);
	await expect(page.getByRole("button", { name: "Import 2 people" })).toBeVisible();
	await expect(page.getByRole("checkbox", { name: "Send invitations now" })).toBeDisabled();
	await screen(page, testInfo, "E2E-011", "2-checked");
	await page.getByRole("button", { name: "Import 2 people" }).click();
	const confirm = page.getByRole("dialog", { name: "Import 2 people?" });
	await expect(confirm.getByText("Nobody is emailed now")).toBeVisible();
	await screen(page, testInfo, "E2E-011", "2b-confirm-no-email");
	await confirm.getByRole("button", { name: "Import people" }).click();
	imported.forEach((person) => recordCreatedIdentity(person.email));
	await expect(page.getByText(/2 added/).first()).toBeVisible({ timeout: 60_000 });
	await screen(page, testInfo, "E2E-011", "3-imported");

	const admin = (await ApiClient.signIn(accounts.emails.admin, accounts.password)).withCompany(seed.companyId);
	const jobs = rowsOf((await admin.get("~/member-imports")).data);
	const job = jobs.find((candidate: any) => candidate.totalRows === 2);
	const member = await findMember(admin, firstImported.email);
	const detail = (await admin.get(`~/member-profiles/${member.membershipId}`)).data;
	await page.goto(`/people/${member.membershipId}`);
	await settle(page);
	await screen(page, testInfo, "E2E-011", "4-profile");
	await expect(page.getByText("Invited", { exact: true }).first()).toBeVisible();
	await page.getByRole("button", { name: /more|actions|options/i }).last().click();
	const resend = page.getByRole("menuitem", { name: /invitation/i }).or(page.getByRole("button", { name: /invitation/i }));
	await page.waitForTimeout(300);
	await screen(page, testInfo, "E2E-011", "5-profile-actions");
	const statusText = JSON.stringify(detail).match(/"(identityStatus|loginStatus|accountStatus|invitationStatus)":"(\w+)"/);
	actual(
		testInfo,
		`import sendInvitations=${job?.sendInvitations}, added=${job?.addedRows}; member status ${member.status}; identity badge "Invited"${statusText ? ` (${statusText[2]})` : ""}; Resend button visible: ${await resend.count() > 0}`
	);
	expect(job?.sendInvitations).toBe(false);
	expect(member.status).toBe("ACTIVE");
	await expect(resend.first()).toBeVisible();
});

test("E2E-012 without an employee code an edited email is still a new person, and the check flags a possible existing member", async ({}, testInfo) => {
	// KNOWN-1 is closed by the Employee code column (E2E-014). Without a code the row is new by design; the check now
	// warns that it may be someone already in the company.
	const admin = (await ApiClient.signIn(accounts.emails.admin, accounts.password)).withCompany(seed.companyId);
	const edited = { ...firstImported, email: `e2e+imp1b-${stamp}@horaion.com` };
	const form = new FormData();
	form.append("file", new Blob([importCsv([edited])], { type: "text/csv" }), "people.csv");
	const check = await admin.upload("~/member-imports/checks", form);
	const notices = (check.data?.rows ?? []).flatMap((row: any) => (row.problems ?? []).map((problem: any) => `${problem.code}/${problem.severity}`));
	actual(testInfo, `check of the edited row without a code: ${check.data?.readyRows} ready, notices ${notices.join(", ") || "none"}`);
	expect(check.data?.readyRows).toBe(1);
	expect(notices).toContain("POSSIBLE_EXISTING_MEMBER/NOTICE");
});
