import { expect, test } from "@playwright/test";

import { ApiClient, expectStatus } from "./support/api";
import { readAccounts } from "./support/environment";
import { readSeed, WEEKS } from "./support/seed-data";
import { createSchedule, departmentPath, generateAndWait, schedulePath } from "./support/schedules";
import { actual, openAs, screen, settle } from "./support/ui";

/** Flow 3: Generate — as the Operations manager; a week over a published one; a second published roster refused. */

const seed = readSeed();
const accounts = readAccounts();
const operationsShifts = [seed.shifts.morning, seed.shifts.evening, seed.shifts.night];
const operationsConstraints = [seed.constraints.morning, seed.constraints.evening, seed.constraints.night];
let overPublishedId = "";

test.describe.configure({ mode: "serial" });

test("E2E-020 the department manager creates a week, generates it and opens the result", async ({ browser }, testInfo) => {
	const manager = (await ApiClient.signIn(accounts.emails.manager, accounts.password)).withCompany(seed.companyId);
	const created = await createSchedule(manager, seed, seed.departments.operations, { name: "Ops week 49", periodStart: WEEKS.generateFlow, shiftIds: operationsShifts, constraintIds: operationsConstraints });
	const result = await generateAndWait(manager, seed, seed.departments.operations, created.scheduleId);
	actual(testInfo, `status ${result.status}, engine outcome ${result.generation?.engineOutcome}, findings ${JSON.stringify(result.generation?.findings ?? {}).slice(0, 160)}`);
	expect(result.status).toBe("GENERATED");

	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${created.scheduleId}`);
	await settle(page);
	await expect(page.getByRole("heading", { name: "Operations Schedule" })).toBeVisible();
	await expect(page.getByRole("table", { name: "Roster" })).toBeVisible();
	await screen(page, testInfo, "E2E-020", "result-page");
	await page.goto("/scheduling");
	await settle(page);
	await screen(page, testInfo, "E2E-020", "overview");
});

test("E2E-021 a week that already has a published roster shows the published-week warning", async ({ browser }, testInfo) => {
	const manager = (await ApiClient.signIn(accounts.emails.manager, accounts.password)).withCompany(seed.companyId);
	const publishedWeek = expectStatus(await manager.get(`${departmentPath(seed, seed.departments.operations)}/schedules/published-week?periodStart=${WEEKS.published}`), 200, "published week");
	const created = await createSchedule(manager, seed, seed.departments.operations, { name: "Ops week 47 again", periodStart: WEEKS.published, shiftIds: operationsShifts, constraintIds: operationsConstraints });
	overPublishedId = created.scheduleId;

	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${created.scheduleId}`);
	await settle(page);
	await screen(page, testInfo, "E2E-021", "draft-over-published-week");
	const generate = page.getByRole("button", { name: /generate/i }).first();
	if (await generate.count()) {
		await generate.click();
		await page.waitForTimeout(800);
		await screen(page, testInfo, "E2E-021", "generate-warning");
	}
	const warning = page.getByText(/already (has a )?published|published roster|is published/i).first();
	const shown = (await warning.count()) > 0 && (await warning.isVisible());
	actual(testInfo, `published-week API → ${publishedWeek?.scheduleId === seed.schedules.published ? "names the published roster" : JSON.stringify(publishedWeek).slice(0, 120)}; warning in the UI: ${shown}`);
	expect(publishedWeek?.scheduleId ?? publishedWeek?.schedule?.scheduleId).toBe(seed.schedules.published);
	expect(shown).toBe(true);
});

test("E2E-022 a second published roster for the same department-week is refused", async ({}, testInfo) => {
	const manager = (await ApiClient.signIn(accounts.emails.manager, accounts.password)).withCompany(seed.companyId);
	const path = schedulePath(seed, seed.departments.operations, overPublishedId);
	const generation = await manager.post(`${path}/generation`);
	const publish = await manager.post(`${path}/approval`);
	actual(testInfo, `generation → ${generation.status} ${generation.errorCode ?? ""}; publish → ${publish.status} ${publish.errorCode ?? ""}`);
	// Refused at generation already (one published roster per department-week), and publishing a draft is refused too.
	expect(generation.status).toBe(409);
	expect(publish.status).toBe(409);
});
