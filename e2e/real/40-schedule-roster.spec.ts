import { expect, test } from "@playwright/test";

import { ApiClient, expectStatus } from "./support/api";
import { readAccounts } from "./support/environment";
import { applyChange, dayOf, previewChange, rosterShifts, undoChange } from "./support/roster";
import { createSchedule, departmentPath, generateAndWait } from "./support/schedules";
import { readSeed, weekDays, WEEKS } from "./support/seed-data";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Flows 4 and 5 on the draft week (Ops week 48): the schedule page at rest, the … menu per user type, roster edits
 * by the editor without leave keys (change, day off, preview, remark, Changes, undo), then the 2b page with findings:
 * grid marks, header counts into filtered Issues, the URL, a compact grid with the panel open, the pinned column.
 */

const seed = readSeed();
const accounts = readAccounts();
const operations = seed.departments.operations;
const draft = seed.schedules.draft;
const [monday, tuesday, wednesday] = weekDays(WEEKS.draft);
const ari = seed.membershipIds.approver;
const changes: string[] = [];
const FINDINGS_WEEK = "2027-01-18";
let findingsScheduleId = "";

test.describe.configure({ mode: "serial" });

test("E2E-030 at rest the roster shows no Issues or Changed buttons and no panel", async ({ browser }, testInfo) => {
	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${draft}`);
	await settle(page);
	const issues = await page.getByRole("button", { name: /^Issues: \d+/ }).count();
	const changed = await page.getByRole("button", { name: /^Changed by hand/ }).count();
	const panel = await page.getByRole("complementary").count();
	actual(testInfo, `Issues buttons ${issues}, Changed buttons ${changed}, side panels ${panel}`);
	await screen(page, testInfo, "E2E-030", "draft-at-rest");
	expect(issues + changed + panel).toBe(0);
});

test("E2E-031 Reject lives in the … menu for the manager; the editor without publish keys gets no Reject", async ({ browser }, testInfo) => {
	const manager = await openAs(browser, "manager");
	await manager.goto(`/scheduling/${draft}`);
	await settle(manager);
	await manager.getByRole("button", { name: /More actions for/ }).click();
	const managerItems = await manager.getByRole("menu").getByRole("menuitem").allInnerTexts();
	await screen(manager, testInfo, "E2E-031", "manager-more-actions");
	const editor = await openAs(browser, "editor");
	await editor.goto(`/scheduling/${draft}`);
	await settle(editor);
	const editorMenu = editor.getByRole("button", { name: /More actions for/ });
	const editorItems = (await editorMenu.count()) ? (await editorMenu.click(), await editor.getByRole("menu").getByRole("menuitem").allInnerTexts()) : [];
	const editorPublish = await editor.getByRole("button", { name: /Publish roster/ }).count();
	await screen(editor, testInfo, "E2E-031", "editor-more-actions");
	actual(testInfo, `manager menu: ${managerItems.join(", ")}; editor menu: ${editorItems.join(", ") || "(none)"}; editor Publish button: ${editorPublish}`);
	expect(managerItems).toContain("Reject");
	expect(editorItems).not.toContain("Reject");
	expect(editorItems).not.toContain("Delete");
	expect(editorPublish).toBe(0);
});

test("E2E-040 the editor changes a shift: preview says rules NOT_CHECKED, apply with a remark", async ({}, testInfo) => {
	const editor = (await ApiClient.signIn(accounts.emails.editor, accounts.password)).withCompany(seed.companyId);
	const shifts = await rosterShifts(editor, seed, operations, draft);
	const cells = [{ membershipId: ari, day: monday, kind: "WORK" as const, shiftId: shifts.Morning }];
	const preview = await previewChange(editor, seed, operations, draft, cells);
	const { applied } = await applyChange(editor, seed, operations, draft, cells, "Ari covers Monday morning");
	const day = await dayOf(editor, seed, operations, draft, ari, monday);
	actual(testInfo, `preview ${preview.status} ruleCheck=${preview.data?.ruleCheck} checks=${(preview.data?.checks ?? []).map((check: any) => check.code).join(",") || "none"}; apply ${applied.status} remark "${applied.data?.remark}"; Ari Monday → ${day?.shift?.name}`);
	expect(preview.data?.ruleCheck).toBe("NOT_CHECKED");
	expect(applied.status).toBe(201);
	expect(day?.shift?.name).toBe("Morning");
	changes.push(applied.data.changeId);
});

test("E2E-041 the editor sets a day off; Changes lists both edits", async ({ browser }, testInfo) => {
	const editor = (await ApiClient.signIn(accounts.emails.editor, accounts.password)).withCompany(seed.companyId);
	const working = (await dayOf(editor, seed, operations, draft, seed.membershipIds.editor, monday))?.off === false ? seed.membershipIds.editor : seed.membershipIds.worker;
	const { applied } = await applyChange(editor, seed, operations, draft, [{ membershipId: working, day: monday, kind: "OFF" }], "Swapped for Ari");
	changes.push(applied.data?.changeId);
	expect(applied.status).toBe(201);

	const page = await openAs(browser, "editor");
	await page.goto(`/scheduling/${draft}`);
	await settle(page);
	const changedButton = page.getByRole("button", { name: /^Changed by hand/ });
	await expect(changedButton).toBeVisible();
	await changedButton.click();
	await settle(page);
	const panel = page.getByRole("complementary");
	await expect(panel).toBeVisible();
	await expect(panel.getByText("Ari covers Monday morning").or(panel.getByText(/Ari Approver/)).first()).toBeVisible();
	actual(testInfo, `day off applied ${applied.status}; header "${await changedButton.innerText()}"; URL ${new URL(page.url()).search}`);
	expect(page.url()).toContain("panel=changes");
	await screen(page, testInfo, "E2E-041", "changes-panel");
});

test("E2E-042 undo of a change that is not the latest is refused; the latest undoes", async ({}, testInfo) => {
	const editor = (await ApiClient.signIn(accounts.emails.editor, accounts.password)).withCompany(seed.companyId);
	const older = await undoChange(editor, seed, operations, draft, changes[0] ?? "");
	const latest = await undoChange(editor, seed, operations, draft, changes[1] ?? "", "Changed my mind");
	actual(testInfo, `undo older → ${older.status} ${older.errorCode ?? ""}; undo latest → ${latest.status}`);
	expect(older.status).toBe(409);
	expect(latest.status).toBe(201);
});

test("E2E-032 findings: grid marks, header counts open a filtered Issues list, the URL keeps week and panel", async ({ browser }, testInfo) => {
	// Edits are not rule-checked (NOT_CHECKED): a 0 h turnaround passes with INFO checks only, so Issues come from the
	// engine. A week that asks for more officers than exist gives real findings.
	const editor = (await ApiClient.signIn(accounts.emails.editor, accounts.password)).withCompany(seed.companyId);
	const shifts = await rosterShifts(editor, seed, operations, draft);
	const { preview } = await applyChange(
		editor,
		seed,
		operations,
		draft,
		[
			{ membershipId: ari, day: tuesday, kind: "WORK", shiftId: shifts.Night },
			{ membershipId: ari, day: wednesday, kind: "WORK", shiftId: shifts.Morning },
		],
		"Short turnaround on purpose"
	);
	actual(testInfo, `0 h turnaround edit: refused=${preview.data?.refused}, checks ${(preview.data?.checks ?? []).map((check: any) => `${check.code}/${check.severity}`).join(",")}, ruleCheck ${preview.data?.ruleCheck}`);

	const admin = (await ApiClient.signIn(accounts.emails.admin, accounts.password)).withCompany(seed.companyId);
	const heavy = expectStatus(
		await admin.post(`${departmentPath(seed, operations)}/constraints`, {
			name: `Night twelve officers ${Date.now().toString(36)}`,
			type: "SHIFT_STAFFING",
			requirement: "MUST",
			status: "ACTIVE",
			values: [
				{ field: "COMPARISON", value: "AT_LEAST" },
				{ field: "HEADCOUNT", value: "12" },
				{ field: "JOB_TITLE", value: seed.jobTitles.officer },
				{ field: "SHIFT", value: seed.shifts.night },
			],
		}),
		201,
		"heavy constraint"
	).constraintId;
	const week = await createSchedule(admin, seed, operations, {
		name: "Ops findings week",
		periodStart: FINDINGS_WEEK,
		shiftIds: [seed.shifts.morning, seed.shifts.evening, seed.shifts.night],
		constraintIds: [seed.constraints.morning, seed.constraints.evening, heavy],
	});
	const generated = await generateAndWait(admin, seed, operations, week.scheduleId);
	actual(testInfo, `findings week generated: ${generated.status}, outcome ${generated.generation?.engineOutcome}`);

	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${week.scheduleId}`);
	await settle(page);
	await screen(page, testInfo, "E2E-032", "1-findings-marks");
	const issuesButton = page.getByRole("button", { name: /^Issues/ });
	actual(testInfo, `Issues button: ${(await issuesButton.count()) ? (await issuesButton.innerText()).replace(/\s+/g, " ") : "none"}`);
	await expect(issuesButton).toBeVisible();

	// A day or member header that carries a count opens Issues narrowed to it.
	const headerCount = page.locator("thead button, th button, [role=rowheader] button").filter({ hasText: /\d/ }).first();
	if (await headerCount.count()) {
		await headerCount.click();
		await settle(page);
		await screen(page, testInfo, "E2E-032", "2-filtered-issues");
		const search = new URL(page.url()).searchParams;
		actual(testInfo, `header count opened ?${search.toString()}`);
		expect(search.get("panel")).toBe("issues");
		expect(search.get("member") ?? search.get("date")).toBeTruthy();
	} else {
		actual(testInfo, "no header on the grid carries a count button");
		expect(await headerCount.count(), "a header count that opens filtered Issues").toBeGreaterThan(0);
	}

	await page.goto(`/scheduling/${week.scheduleId}?week=${FINDINGS_WEEK}&panel=issues`);
	await settle(page);
	await expect(page.getByRole("complementary")).toBeVisible();
	await screen(page, testInfo, "E2E-032", "3-issues-panel-from-url");
	const tableBox = await page.getByRole("table", { name: "Roster" }).boundingBox();
	actual(testInfo, `with the panel open the grid is ${Math.round(tableBox?.width ?? 0)} px wide in a 1440 px window`);
	expect(tableBox?.width ?? 0).toBeLessThan(1100);
	findingsScheduleId = week.scheduleId;
});

test("E2E-033 at 390 px the staff column stays pinned while the days scroll", async ({ browser }, testInfo) => {
	const page = await openAs(browser, "manager", { width: 390, height: 844 });
	await page.goto(`/scheduling/${findingsScheduleId || draft}`);
	await settle(page);
	const staffHeader = page.getByRole("columnheader", { name: "Staff" });
	const before = await staffHeader.boundingBox();
	await screen(page, testInfo, "E2E-033", "1-390-before-scroll");
	await page.getByRole("table", { name: "Roster" }).evaluate((table) => {
		let node: HTMLElement | null = table as HTMLElement;
		while (node && node.scrollWidth <= node.clientWidth) node = node.parentElement;
		if (node) node.scrollLeft = 400;
	});
	await page.waitForTimeout(300);
	const after = await staffHeader.boundingBox();
	const sunday = await page.getByRole("columnheader", { name: /^Sun/ }).boundingBox();
	await screen(page, testInfo, "E2E-033", "2-390-after-scroll");
	const pageScroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
	actual(testInfo, `staff header x ${before?.x} → ${after?.x}; Sunday header x ${sunday?.x}; page horizontal overflow ${pageScroll}px`);
	expect(Math.abs((after?.x ?? -1) - (before?.x ?? -2))).toBeLessThan(2);
	expect(pageScroll).toBeLessThanOrEqual(1);
});
