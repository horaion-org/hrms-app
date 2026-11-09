import { expect, type Page, test } from "@playwright/test";

import { ApiClient, expectStatus, rowsOf } from "./support/api";
import { writeFileSync } from "node:fs";

import { APPROVALS_SEEN_FILE, readAccounts, type Role } from "./support/environment";
import { notificationsOf, waitForNotification } from "./support/notifications";
import { applyChange, rosterShifts } from "./support/roster";
import { addDays, readSeed, weekDays, WEEKS } from "./support/seed-data";
import { departmentPath, generatedOperationsWeek, schedulePath } from "./support/schedules";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Approvals UI (app #109, P2) over the P2+P3 backend (#159), on Operations. Settings › Approvals CRUD, then one flow:
 * step 1 "Endorse" (anyone who can publish Operations: admin, manager, approver) and step 2 "Sign off" (Ari only).
 * The manager submits; the admin endorses; Ari approves and publishes or rejects. Then the P3 cases: an edit cancels
 * a submission and tells the submitter, one person eligible for both steps approves once (step 1 Skipped), distinct
 * approvers forbid that and the stalled step is reported, Needs review, and leave walked through a LEAVE_REQUEST flow.
 * The app has no P3 screens yet (no distinct-approvers toggle, no copy for the cancelled and stalled notices), so
 * those parts are checked through the API and what the current screens show is recorded.
 */

const seed = readSeed();
const accounts = readAccounts();
const operations = seed.departments.operations;
const signIn = async (role: Role) => (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);
const memberOf = (key: string) => seed.members.find((member) => member.key === key)!;
const state: { flowId?: string; weeks: Record<string, string>; leaveFlowId?: string; leaveRoleId?: string; leaveAssignmentId?: string } = { weeks: {} };
/**
 * What the cases saw of gaps the app or API leaves (D-11, D-12, D-19): written to the run folder at the end and judged
 * by 77-approvals-gaps, so a gap fails its own case instead of skipping the rest of this serial file.
 */
const seen: { managerRequests?: number; managerDecides?: string; managerRejected?: string; submitterMeta?: string; submitAfterSubmit?: number; submitterMenu?: string[]; cancelledGeneric?: number; stalledGeneric?: number; skippedTrail?: string } = {};
const FLOW_STEPS = [
	{ label: "Endorse", rule: "KEY_HOLDERS", quorum: "ANY", memberIds: [] as string[] },
	{ label: "Sign off", rule: "MEMBERS", quorum: "ANY", memberIds: [seed.membershipIds.approver] },
];

async function instanceOf(api: ApiClient, subjectType: string, subjectId: string): Promise<any> {
	const rows = rowsOf(expectStatus(await api.get(`~/approval-instances?subjectType=${subjectType}&subjectId=${subjectId}`), 200, "instances"));
	const newest = rows[0];
	return newest ? expectStatus(await api.get(`~/approval-instances/${newest.approvalInstanceId}`), 200, "instance") : undefined;
}

const stepsOf = (instance: any) =>
	(instance?.steps ?? []).map((step: any) => `${step.stepOrder}:${step.label}:${step.status}${step.skippedBy ? `(skipped by ${step.skippedBy.displayName})` : ""}`).join(" ");

async function openRoster(page: Page, scheduleId: string): Promise<void> {
	await page.goto(`/scheduling/${scheduleId}`);
	await settle(page);
}

/** The roster header's meta line about approval, if any. */
async function metaLine(page: Page): Promise<string> {
	const line = page.getByText(/^(Waiting on you|Waiting for approval|Needs approval)/).first();
	return (await line.count()) ? (await line.innerText()).trim() : "(none)";
}

async function menuItems(page: Page): Promise<string[]> {
	const more = page.getByRole("button", { name: /More actions for/ });
	if (!(await more.count())) return [];
	await more.click();
	const items = await page.getByRole("menu").getByRole("menuitem").allInnerTexts();
	await page.keyboard.press("Escape");
	return items;
}

test.describe.configure({ mode: "serial" });

test("E2E-140 Settings › Approvals: add a department flow (2 steps, named people), edit to 'All of them', cap at 3 steps; a company-wide flow turned off, on and deleted", async ({ browser }, testInfo) => {
	const admin = await signIn("admin");
	const page = await openAs(browser, "admin");
	await page.goto("/settings?section=approvals");
	await settle(page);
	await screen(page, testInfo, "E2E-140", "1-empty");
	await page.getByRole("button", { name: "Add flow" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByRole("button", { name: "Applies to" }).click();
	await page.getByRole("option", { name: "Central › Operations" }).click();
	const steps = dialog.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /^Step \d$/ }) });
	await steps.nth(0).getByRole("textbox", { name: "Name of step 1" }).fill("Endorse");
	await dialog.getByRole("button", { name: "Add step" }).click();
	await steps.nth(1).getByRole("textbox", { name: "Name of step 2" }).fill("Sign off");
	await steps.nth(1).getByRole("radio", { name: "Only these people" }).check({ force: true });
	await steps.nth(1).getByRole("button", { name: "People" }).click();
	await page.getByRole("option", { name: memberOf("approver").name }).click();
	await page.keyboard.press("Escape");
	await screen(page, testInfo, "E2E-140", "2-add-dialog");
	await dialog.getByRole("button", { name: "Save flow" }).click();
	await expect(page.getByText("Approval flow added.").first()).toBeVisible({ timeout: 15_000 });
	const row = page.getByRole("row", { name: /Operations/ });
	const rowText = (await row.innerText()).replace(/\s+/g, " ");
	await screen(page, testInfo, "E2E-140", "3-flow-listed");

	await page.getByRole("button", { name: "Edit Operations publishing" }).click();
	const edit = page.getByRole("dialog");
	const editSteps = edit.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /^Step \d$/ }) });
	await editSteps.nth(1).getByRole("button", { name: "People" }).click();
	await page.getByRole("option", { name: "Ada Admin" }).click();
	await page.keyboard.press("Escape");
	await editSteps.nth(1).getByRole("radio", { name: "All of them" }).check({ force: true });
	await edit.getByRole("button", { name: "Add step" }).click();
	// At three steps the button is either gone or disabled.
	const addStep = edit.getByRole("button", { name: "Add step" });
	const addStepAtThree = (await addStep.count()) === 0 || (await addStep.isDisabled());
	const capNote = await edit.getByText("Up to 3 steps.").count();
	await screen(page, testInfo, "E2E-140", "4-edit-three-steps");
	await edit.getByRole("button", { name: "Remove step 3" }).click();
	await edit.getByRole("button", { name: "Save flow" }).click();
	await expect(page.getByText("Approval flow saved.").first()).toBeVisible({ timeout: 15_000 });
	const editedRow = (await page.getByRole("row", { name: /Operations/ }).innerText()).replace(/\s+/g, " ");
	const flows = rowsOf((await admin.get("~/approval-flows")).data);
	const operationsFlow = flows.find((flow: any) => flow.departmentId === operations);
	state.flowId = operationsFlow?.approvalFlowId;
	const savedSteps = (operationsFlow?.steps ?? []).map((step: any) => `${step.label}/${step.rule}/${step.quorum}/${(step.members ?? step.memberIds ?? []).length}`).join(" → ");

	await page.getByRole("button", { name: "Add flow" }).click();
	await page.getByRole("dialog").getByRole("textbox", { name: "Name of step 1" }).fill("Check");
	await page.getByRole("dialog").getByRole("button", { name: "Save flow" }).click();
	await expect(page.getByText("Approval flow added.").first()).toBeVisible({ timeout: 15_000 });
	const companyRow = page.getByRole("row", { name: /Whole company/ });
	await page.getByRole("button", { name: "More actions for Whole company publishing" }).click();
	await page.getByRole("menuitem", { name: "Turn off" }).click();
	await page.getByRole("dialog").getByRole("button", { name: "Turn off" }).click();
	await settle(page);
	const offStatus = (await companyRow.innerText()).replace(/\s+/g, " ");
	await screen(page, testInfo, "E2E-140", "5-company-flow-off");
	await page.getByRole("button", { name: "More actions for Whole company publishing" }).click();
	await page.getByRole("menuitem", { name: "Turn on" }).click();
	await page.getByRole("dialog").getByRole("button", { name: "Turn on" }).click();
	await settle(page);
	const onStatus = (await companyRow.innerText()).replace(/\s+/g, " ");
	await page.getByRole("button", { name: "More actions for Whole company publishing" }).click();
	await page.getByRole("menuitem", { name: "Delete" }).click();
	await page.getByRole("dialog").getByRole("button", { name: "Delete flow" }).click();
	await expect(page.getByText("Approval flow deleted.").first()).toBeVisible({ timeout: 15_000 });
	const companyRowsLeft = await page.getByRole("row", { name: /Whole company/ }).count();
	await screen(page, testInfo, "E2E-140", "6-after-delete");

	// The later cases need step 2 to name Ari alone: put it back through the API.
	expectStatus(await admin.put(`~/approval-flows/${state.flowId}`, { name: "Operations publishing", active: true, steps: FLOW_STEPS, distinctApprovers: false }), 200, "reset flow");
	actual(
		testInfo,
		`row "${rowText}"; edited row "${editedRow}", saved steps ${savedSteps}; Add step disabled at 3: ${addStepAtThree}, "Up to 3 steps." ${capNote}; company row off "${offStatus}", on "${onStatus}", rows after delete ${companyRowsLeft}`
	);
	expect(rowText).toContain("1 Endorse → 2 Sign off");
	expect(savedSteps).toBe("Endorse/KEY_HOLDERS/ANY/0 → Sign off/MEMBERS/ALL/2");
	expect(addStepAtThree).toBe(true);
	expect(offStatus).toContain("Off");
	expect(onStatus).toContain("On");
	expect(companyRowsLeft).toBe(0);
});

test("E2E-141 Publish reads 'Submit for approval'; the meta line says whose turn; Approve, then 'Approve and publish' publishes; the trail names who decided", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const scheduleId = await generatedOperationsWeek(manager, seed, "Ops approvals UI week", WEEKS.approvalsUi);
	state.weeks["ui"] = scheduleId;
	const managerPage = await openAs(browser, "manager");
	await openRoster(managerPage, scheduleId);
	const submit = managerPage.getByRole("button", { name: "Submit for approval" });
	const submitShown = await submit.count();
	const publishShown = await managerPage.getByRole("button", { name: "Publish roster" }).count();
	await submit.click();
	const dialog = managerPage.getByRole("dialog");
	const dialogText = (await dialog.innerText()).replace(/\s+/g, " ");
	await screen(managerPage, testInfo, "E2E-141", "1-submit-dialog");
	await dialog.getByRole("button", { name: "Submit for approval" }).click();
	await expect(managerPage.getByText(/^Sent for approval\./).first()).toBeVisible({ timeout: 15_000 });
	await settle(managerPage);
	const submitterMeta = await metaLine(managerPage);
	const submitAfterSubmit = await managerPage.getByRole("button", { name: "Submit for approval" }).count();
	await screen(managerPage, testInfo, "E2E-141", "2-submitted-manager");

	const adminPage = await openAs(browser, "admin");
	await openRoster(adminPage, scheduleId);
	const adminMeta = await metaLine(adminPage);
	await screen(adminPage, testInfo, "E2E-141", "3-admin-waiting-on-you");
	await adminPage.getByRole("button", { name: "Approve", exact: true }).click();
	const approveDialog = adminPage.getByRole("dialog");
	const approveText = (await approveDialog.innerText()).replace(/\s+/g, " ");
	await approveDialog.getByRole("button", { name: "Confirm approval" }).click();
	await expect(adminPage.getByText(/^You approved Endorse\./).first()).toBeVisible({ timeout: 15_000 });

	const approverPage = await openAs(browser, "approver");
	await openRoster(approverPage, scheduleId);
	const approverMeta = await metaLine(approverPage);
	const lastButton = approverPage.getByRole("button", { name: "Approve and publish" });
	const lastShown = await lastButton.count();
	await screen(approverPage, testInfo, "E2E-141", "4-approver-last-step");
	await lastButton.first().click();
	await approverPage.getByRole("dialog").getByRole("button", { name: "Approve and publish" }).click();
	await expect(approverPage.getByText(/^You approved and published the/).first()).toBeVisible({ timeout: 20_000 });
	await settle(approverPage);
	await approverPage.getByRole("button", { name: /Approval ›|Open the approval/ }).first().click().catch(() => undefined);
	await settle(approverPage);
	const trail = (await approverPage.getByRole("complementary").innerText({ timeout: 10_000 }).catch(() => "")).replace(/\s+/g, " ");
	await screen(approverPage, testInfo, "E2E-141", "5-published-trail");
	const schedule = (await manager.get(schedulePath(seed, operations, scheduleId))).data;
	actual(
		testInfo,
		`manager: Submit button ${submitShown}, Publish button ${publishShown}; dialog "${dialogText.slice(0, 200)}"; submitter (no approval:read) meta "${submitterMeta}", Submit still offered ${submitAfterSubmit}; admin meta "${adminMeta}"; approve dialog "${approveText.slice(0, 160)}"; approver meta "${approverMeta}", Approve and publish ${lastShown}; status ${schedule.status}; trail "${trail.slice(0, 300)}"`
	);
	expect(submitShown).toBe(1);
	expect(publishShown).toBe(0);
	seen.submitterMeta = submitterMeta;
	seen.submitAfterSubmit = submitAfterSubmit;
	expect(adminMeta).toBe("Waiting on you · step 1 of 2 (Endorse)");
	expect(approverMeta).toBe("Waiting on you · step 2 of 2 (Sign off)");
	expect(lastShown).toBe(1);
	expect(schedule.status).toBe("PUBLISHED");
	expect(trail).toContain("Ada Admin");
	expect(trail).toContain(memberOf("approver").name);
});

test("E2E-142 Reject sits in ⋯ for the step's approver and the trail names the step it was rejected at", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const admin = await signIn("admin");
	const scheduleId = await generatedOperationsWeek(manager, seed, "Ops approvals reject week", WEEKS.approvalsUiReject);
	state.weeks["reject"] = scheduleId;
	expectStatus(await manager.post(`${schedulePath(seed, operations, scheduleId)}/approval-request`), 200, "submit");
	const instance = await instanceOf(admin, "SCHEDULE_PUBLICATION", scheduleId);
	expectStatus(await admin.post(`~/approval-instances/${instance.approvalInstanceId}/decisions`, { stepOrder: 1, decision: "APPROVE", comment: "Fine by me" }), 200, "endorse");

	const page = await openAs(browser, "approver");
	await openRoster(page, scheduleId);
	const items = await menuItems(page);
	await page.getByRole("button", { name: /More actions for/ }).click();
	await page.getByRole("menuitem", { name: "Reject" }).click();
	const dialog = page.getByRole("dialog");
	const title = (await dialog.getByRole("heading").first().innerText()).trim();
	await dialog.getByRole("textbox").fill("Saturday night has no supervisor");
	await screen(page, testInfo, "E2E-142", "1-reject-dialog");
	await dialog.getByRole("button", { name: "Confirm rejection" }).click();
	await expect(page.getByText(/^You rejected the roster at Sign off\./).first()).toBeVisible({ timeout: 15_000 });
	await openRoster(page, scheduleId);
	const rejectedLine = page.getByText(/^Rejected at Sign off/).first();
	const rejectedText = (await rejectedLine.count()) ? (await rejectedLine.innerText()).trim() : "(none)";
	const reasonShown = await page.getByText("Saturday night has no supervisor").count();
	await screen(page, testInfo, "E2E-142", "2-approver-sees-rejection");
	const managerPage = await openAs(browser, "manager");
	await openRoster(managerPage, scheduleId);
	const managerLine = managerPage.getByText(/^Rejected (at|by)/).first();
	seen.managerRejected = (await managerLine.count()) ? (await managerLine.innerText()).trim() : "(none)";
	await screen(managerPage, testInfo, "E2E-142", "3-manager-sees-rejection");
	const after = await instanceOf(admin, "SCHEDULE_PUBLICATION", scheduleId);
	actual(testInfo, `approver menu: ${items.join(", ")}; dialog "${title}"; approver's roster "${rejectedText}", reason shown ${reasonShown}; manager (no approval:read) "${seen.managerRejected}"; instance ${after.status}: ${stepsOf(after)}`);
	expect(items).toContain("Reject");
	expect(title).toBe("Reject at Sign off?");
	expect(rejectedText).toMatch(new RegExp(`^Rejected at Sign off by ${memberOf("approver").name}`));
	expect(reasonShown).toBeGreaterThan(0);
	expect(after.status).toBe("REJECTED");
});

test("E2E-143 the submitter withdraws from approval; the roster offers Submit again", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const admin = await signIn("admin");
	const scheduleId = await generatedOperationsWeek(manager, seed, "Ops approvals withdraw week", WEEKS.approvalsWithdraw);
	state.weeks["withdraw"] = scheduleId;
	const path = schedulePath(seed, operations, scheduleId);
	// The department manager submits: it holds schedule:publish but not approval:read.
	expectStatus(await manager.post(`${path}/approval-request`), 200, "manager submits");
	const managerPage = await openAs(browser, "manager");
	await openRoster(managerPage, scheduleId);
	const managerItems = await menuItems(managerPage);
	await screen(managerPage, testInfo, "E2E-143", "1-manager-submitter-menu");
	const managerInstance = await instanceOf(admin, "SCHEDULE_PUBLICATION", scheduleId);
	const managerWithdrawsByApi = await manager.post(`~/me/approval-instances/${managerInstance.approvalInstanceId}/cancellation`);

	// The admin submits: it holds approval:read, so the page sees its submission.
	expectStatus(await admin.post(`${path}/approval-request`), 200, "admin submits");
	const page = await openAs(browser, "admin");
	await openRoster(page, scheduleId);
	const adminItems = await menuItems(page);
	await page.getByRole("button", { name: /More actions for/ }).click();
	await page.getByRole("menuitem", { name: "Withdraw from approval" }).click();
	const dialog = page.getByRole("dialog");
	await screen(page, testInfo, "E2E-143", "2-withdraw-dialog");
	await dialog.getByRole("button", { name: "Withdraw" }).click();
	await expect(page.getByText("Roster withdrawn from approval.").first()).toBeVisible({ timeout: 15_000 });
	await settle(page);
	const submitAgain = await page.getByRole("button", { name: "Submit for approval" }).count();
	await screen(page, testInfo, "E2E-143", "3-withdrawn");
	const instance = await instanceOf(admin, "SCHEDULE_PUBLICATION", scheduleId);
	actual(
		testInfo,
		`manager as submitter (no approval:read): menu ${managerItems.join(", ")}; its /me withdrawal by API ${managerWithdrawsByApi.status}; admin as submitter: menu ${adminItems.join(", ")}; after withdrawing: Submit for approval ${submitAgain}; instance ${instance.status}`
	);
	seen.submitterMenu = managerItems;
	expect(managerWithdrawsByApi.status).toBe(200);
	expect(adminItems).toContain("Withdraw from approval");
	expect(submitAgain).toBe(1);
	expect(instance.status).toMatch(/WITHDRAWN|CANCELLED/);
});

test("E2E-144 a roster edit while waiting cancels the submission and tells the submitter (APPROVAL_CANCELLED)", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const admin = await signIn("admin");
	const editor = await signIn("editor");
	const scheduleId = await generatedOperationsWeek(manager, seed, "Ops approvals edit week", WEEKS.approvalsCancelled);
	state.weeks["cancelled"] = scheduleId;
	const since = new Date().toISOString();
	expectStatus(await manager.post(`${schedulePath(seed, operations, scheduleId)}/approval-request`), 200, "submit");
	const week = weekDays(WEEKS.approvalsCancelled);
	const shifts = await rosterShifts(editor, seed, operations, scheduleId);
	const edit = await applyChange(editor, seed, operations, scheduleId, [{ membershipId: seed.membershipIds.worker, day: week[3], kind: "WORK", shiftId: shifts.Evening }], "Swap in for the evening");
	const instance = await instanceOf(admin, "SCHEDULE_PUBLICATION", scheduleId);
	const notice = await waitForNotification(manager, "APPROVAL_CANCELLED", since);
	const page = await openAs(browser, "manager");
	await page.goto("/notifications");
	await settle(page);
	const generic = await page.getByText("You have a new notification.").count();
	await screen(page, testInfo, "E2E-144", "1-submitter-inbox");
	await openRoster(page, scheduleId);
	const submitAgain = await page.getByRole("button", { name: "Submit for approval" }).count();
	await screen(page, testInfo, "E2E-144", "2-roster-submit-again");
	actual(
		testInfo,
		`edit ${edit.applied.status}; instance ${instance.status}; submitter APPROVAL_CANCELLED notice: ${notice ? "yes" : "no"}; inbox rows reading the generic "You have a new notification.": ${generic}; roster offers Submit again: ${submitAgain}`
	);
	expect(edit.applied.status).toBe(201);
	expect(instance.status).toBe("CANCELLED");
	expect(notice).toBeTruthy();
	expect(submitAgain).toBe(1);
	seen.cancelledGeneric = generic;
});

test("E2E-145 one person eligible for both steps approves once: step 1 Skipped with their name, the roster publishes", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const admin = await signIn("admin");
	const approver = await signIn("approver");
	const scheduleId = await generatedOperationsWeek(manager, seed, "Ops approvals carry week", WEEKS.approvalsCarry);
	state.weeks["carry"] = scheduleId;
	expectStatus(await manager.post(`${schedulePath(seed, operations, scheduleId)}/approval-request`), 200, "submit");
	const pending = await instanceOf(admin, "SCHEDULE_PUBLICATION", scheduleId);
	const decided = await approver.post(`~/approval-instances/${pending.approvalInstanceId}/decisions`, { stepOrder: 1, decision: "APPROVE", comment: "Covers both" });
	const instance = await instanceOf(admin, "SCHEDULE_PUBLICATION", scheduleId);
	const schedule = (await manager.get(schedulePath(seed, operations, scheduleId))).data;
	// The trail needs approval:read, which the manager lacks: read it as the approver.
	const page = await openAs(browser, "approver");
	await page.goto(`/scheduling/${scheduleId}?panel=approval`);
	await settle(page);
	const trail = (await page.getByRole("complementary").innerText({ timeout: 10_000 }).catch(() => "")).replace(/\s+/g, " ");
	await screen(page, testInfo, "E2E-145", "1-trail-skipped");
	const skipped = (instance.steps ?? []).find((step: any) => step.stepOrder === 1);
	actual(testInfo, `one decision ${decided.status}; instance ${instance.status}: ${stepsOf(instance)}; schedule ${schedule.status}; trail "${trail.slice(0, 300)}"`);
	expect(decided.status).toBe(200);
	expect(instance.status).toBe("APPROVED");
	expect(skipped?.status).toBe("SKIPPED");
	expect(skipped?.skippedBy?.displayName).toBe(memberOf("approver").name);
	expect(schedule.status).toBe("PUBLISHED");
	expect(trail).toContain("Skipped");
	seen.skippedTrail = trail;
});

test("E2E-146 with distinct approvers the same person cannot take step 2; the step stalls and flow managers are told once", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const admin = await signIn("admin");
	const approver = await signIn("approver");
	expectStatus(await admin.put(`~/approval-flows/${state.flowId}`, { name: "Operations publishing", active: true, steps: FLOW_STEPS, distinctApprovers: true }), 200, "distinct approvers on");
	const scheduleId = await generatedOperationsWeek(manager, seed, "Ops approvals distinct week", WEEKS.approvalsDistinct);
	state.weeks["distinct"] = scheduleId;
	const since = new Date().toISOString();
	expectStatus(await manager.post(`${schedulePath(seed, operations, scheduleId)}/approval-request`), 200, "submit");
	const pending = await instanceOf(admin, "SCHEDULE_PUBLICATION", scheduleId);
	const first = await approver.post(`~/approval-instances/${pending.approvalInstanceId}/decisions`, { stepOrder: 1, decision: "APPROVE", comment: "Step one only" });
	const second = await approver.post(`~/approval-instances/${pending.approvalInstanceId}/decisions`, { stepOrder: 2, decision: "APPROVE", comment: "Trying step two" });
	const instance = await instanceOf(admin, "SCHEDULE_PUBLICATION", scheduleId);
	const stalled = await waitForNotification(admin, "APPROVAL_STEP_STALLED", since, () => true, 75_000);
	await new Promise((resolve) => setTimeout(resolve, 25_000));
	const stalledCount = (await notificationsOf(admin)).filter((row) => row.type === "APPROVAL_STEP_STALLED" && (row.createdAt ?? "") >= since).length;
	const page = await openAs(browser, "approver");
	await openRoster(page, scheduleId);
	const approveButtons = await page.getByRole("button", { name: /^Approve/ }).count();
	await screen(page, testInfo, "E2E-146", "1-approver-no-step-2");
	const adminPage = await openAs(browser, "admin");
	await adminPage.goto("/notifications");
	await settle(adminPage);
	seen.stalledGeneric = await adminPage.getByText("You have a new notification.").count();
	await screen(adminPage, testInfo, "E2E-146", "2-admin-inbox-stall");
	// A flow manager withdraws the stuck submission and distinct approvers go back off.
	const unstuck = await admin.post(`~/approval-instances/${pending.approvalInstanceId}/cancellation`);
	expectStatus(await admin.put(`~/approval-flows/${state.flowId}`, { name: "Operations publishing", active: true, steps: FLOW_STEPS, distinctApprovers: false }), 200, "distinct approvers off");
	actual(
		testInfo,
		`flow distinctApprovers=${instance.distinctApprovers}; Ari step 1 ${first.status}, step 2 → ${second.status} ${second.errorCode ?? ""}; instance ${instance.status}: ${stepsOf(instance)}; stall notice to admin: ${stalled ? "yes" : "no"}, count after another sweep ${stalledCount}; Ari's Approve buttons ${approveButtons}; flow manager withdrawal ${unstuck.status}`
	);
	expect(first.status).toBe(200);
	expect(second.status).toBe(403);
	expect(instance.status).toBe("PENDING");
	expect(stalled).toBeTruthy();
	expect(stalledCount).toBe(1);
	expect(approveButtons).toBe(0);
});

test("E2E-147 Needs review lists approval requests for approval:decide holders and opens the roster with the trail", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const admin = await signIn("admin");
	const approver = await signIn("approver");
	const scheduleId = state.weeks["withdraw"]!;
	const since = new Date().toISOString();
	expectStatus(await manager.post(`${schedulePath(seed, operations, scheduleId)}/approval-request`), 200, "submit again");
	// Delivery follows the commit by a few seconds and the inbox does not refetch: wait for it before opening.
	await waitForNotification(approver, "APPROVAL_REQUESTED", since);
	// E2E-143's admin submission asked step 1's key holders: the manager holds schedule:publish but not approval:decide.
	const managerInbox = [...(await notificationsOf(manager)), ...(await notificationsOf(manager, "REVIEW"))];
	seen.managerRequests = managerInbox.filter((row) => row.type === "APPROVAL_REQUESTED").length;
	const adminSubmitted = await instanceOf(admin, "SCHEDULE_PUBLICATION", scheduleId);
	const managerTry = await manager.post(`~/approval-instances/${adminSubmitted.approvalInstanceId}/decisions`, { stepOrder: 1, decision: "APPROVE", comment: "Asked to" });
	seen.managerDecides = `${managerTry.status} ${managerTry.errorCode ?? ""}`;
	const page = await openAs(browser, "approver");
	await page.goto("/notifications");
	await settle(page);
	await page.getByRole("tab", { name: "Needs review" }).or(page.getByRole("button", { name: "Needs review" })).first().click();
	await settle(page);
	const requests = page.getByText("A roster needs your approval.");
	await requests.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
	const listed = await requests.count();
	await screen(page, testInfo, "E2E-147", "1-approver-needs-review");
	await requests.first().click();
	await settle(page);
	const url = page.url();
	await page.getByRole("complementary").getByText(/Step 1 of 2|Endorse/).first().waitFor({ timeout: 15_000 }).catch(() => undefined);
	const trailShown = await page.getByRole("complementary").getByText(/Step 1 of 2|Endorse/).count();
	await screen(page, testInfo, "E2E-147", "2-opened-roster-trail");
	const managerPage = await openAs(browser, "manager");
	await managerPage.goto("/notifications");
	await settle(managerPage);
	const managerTab = managerPage.getByRole("tab", { name: "Needs review" }).or(managerPage.getByRole("button", { name: "Needs review" }));
	if (await managerTab.count()) await managerTab.first().click();
	await settle(managerPage);
	await managerPage.waitForTimeout(2_000);
	const managerListed = await managerPage.getByText("A roster needs your approval.").count();
	await screen(managerPage, testInfo, "E2E-147", "3-manager-needs-review");
	actual(testInfo, `approver Needs review approval rows ${listed}; opened ${url.replace(/^.*\/scheduling/, "/scheduling")}, trail ${trailShown}; manager (no approval:decide) approval rows ${managerListed}`);
	expect(listed).toBeGreaterThan(0);
	expect(url).toContain("panel=approval");
	expect(trailShown).toBeGreaterThan(0);
	expect(managerListed).toBe(0);
});

test("E2E-148 a LEAVE_REQUEST flow walks leave through its steps; the single-step approve and reject answer 409; past leave needs a comment at the last step", async ({ browser }, testInfo) => {
	const admin = await signIn("admin");
	const manager = await signIn("manager");
	const worker = await signIn("worker");
	const hana = memberOf("hr");
	// Deciding a step needs approval:decide as well as leave_request:review at Operations: give HR both there.
	state.leaveRoleId = expectStatus(await admin.post("~/access-roles", { name: `Leave step approver ${Date.now().toString(36)}`, permissions: ["approval:read", "approval:decide", "leave_request:read", "leave_request:review"] }), 201, "leave approver role").accessRoleId;
	state.leaveAssignmentId = expectStatus(
		await admin.post(`${departmentPath(seed, operations)}/access-role-assignments`, { companyMembershipId: hana.membershipId, accessRoleId: state.leaveRoleId }),
		201,
		"assign leave approver"
	)?.accessRoleAssignmentId;
	state.leaveFlowId = expectStatus(
		await admin.post("~/approval-flows", {
			subjectType: "LEAVE_REQUEST",
			departmentId: operations,
			name: "Operations leave",
			steps: [
				{ label: "HR check", rule: "MEMBERS", quorum: "ANY", memberIds: [hana.membershipId] },
				{ label: "Sign off", rule: "MEMBERS", quorum: "ANY", memberIds: [seed.membershipIds.admin] },
			],
		}),
		201,
		"leave flow"
	).approvalFlowId;
	const hr = await signIn("hr");
	for (let attempt = 0; attempt < 20 && (await hr.get("~/approval-instances?subjectType=LEAVE_REQUEST")).status !== 200; attempt++) {
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
	const day = addDays(WEEKS.leaveFlow, 2);
	const applied = await worker.post("~/me/leave-requests", { leaveType: "ANNUAL", startDate: day, endDate: day, notes: "Through the flow" });
	const leaveId = expectStatus(applied, 201, "worker applies under the leave flow").leaveRequestId;
	const leavePath = `~/member-profiles/${seed.membershipIds.worker}/leave-requests/${leaveId}`;
	const instance = await instanceOf(admin, "LEAVE_REQUEST", leaveId);
	const singleApprove = await manager.post(`${leavePath}/approval`, { comment: "Direct" });
	const singleReject = await manager.post(`${leavePath}/rejection`, { reason: "Direct" });
	const managerPage = await openAs(browser, "manager");
	await managerPage.goto("/leave");
	await settle(managerPage);
	await screen(managerPage, testInfo, "E2E-148", "1-manager-leave-list-under-flow");
	const step1 = await hr.post(`~/approval-instances/${instance.approvalInstanceId}/decisions`, { stepOrder: 1, decision: "APPROVE", comment: "Balance is fine" });
	const step2 = await admin.post(`~/approval-instances/${instance.approvalInstanceId}/decisions`, { stepOrder: 2, decision: "APPROVE", comment: "Fine by me" });
	// This /me read answers a bare body, not the {success, data} envelope (D-07).
	const leaveAnswer = await worker.get(`~/me/leave-requests/${leaveId}`);
	const leave = leaveAnswer.data ?? leaveAnswer.body;

	const omar = memberOf("p5");
	const past = addDays(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date()), -4);
	// The admin applies on Omar's behalf (the manager role holds no leave_request:create); Omar stays the requester.
	const pastLeave = await admin.post(`~/member-profiles/${omar.membershipId}/leave-requests`, { leaveType: "ANNUAL", startDate: past, endDate: past, notes: "Missed applying" });
	expectStatus(pastLeave, 201, "apply for past leave");
	const pastInstance = await instanceOf(admin, "LEAVE_REQUEST", pastLeave.data?.leaveRequestId);
	const pastStep1 = await hr.post(`~/approval-instances/${pastInstance?.approvalInstanceId}/decisions`, { stepOrder: 1, decision: "APPROVE", comment: "" });
	const pastBare = await admin.post(`~/approval-instances/${pastInstance?.approvalInstanceId}/decisions`, { stepOrder: 2, decision: "APPROVE", comment: "" });
	const pastWithComment = await admin.post(`~/approval-instances/${pastInstance?.approvalInstanceId}/decisions`, { stepOrder: 2, decision: "APPROVE", comment: "He was on leave; recorded late" });

	expectStatus(await admin.delete(`~/approval-flows/${state.leaveFlowId}`), 204, "delete leave flow");
	state.leaveFlowId = undefined;
	// HR goes back to its seeded keys before the permission matrix runs.
	expectStatus(await admin.delete(`~/access-role-assignments/${state.leaveAssignmentId}`), 204, "remove the leave approver role");
	state.leaveAssignmentId = undefined;
	for (let attempt = 0; attempt < 20 && (await hr.get("~/approval-instances?subjectType=LEAVE_REQUEST")).status === 200; attempt++) {
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
	actual(
		testInfo,
		`worker applies ${applied.status}; instance ${instance?.status} ${stepsOf(instance)}; single-step approve → ${singleApprove.status} ${singleApprove.errorCode ?? ""}, reject → ${singleReject.status} ${singleReject.errorCode ?? ""}; HR step 1 ${step1.status} ${step1.errorCode ?? ""}, admin step 2 ${step2.status} ${step2.errorCode ?? ""}; leave ${leave?.status}; past leave ${pastLeave.status}, instance ${pastInstance ? "yes" : "no"}, step 1 ${pastStep1.status}, last step without comment → ${pastBare.status} ${pastBare.errorCode ?? ""}, with comment → ${pastWithComment.status}`
	);
	expect(instance?.status).toBe("PENDING");
	expect(singleApprove.status).toBe(409);
	expect(singleApprove.errorCode).toBe("LEAVE_APPROVAL_PENDING");
	expect(singleReject.status).toBe(409);
	expect(step1.status).toBe(200);
	expect(step2.status).toBe(200);
	expect(leave?.status).toBe("APPROVED");
	expect(pastBare.status).toBe(400);
	expect(pastBare.errorCode).toBe("LEAVE_COMMENT_REQUIRED_FOR_PAST_DAYS");
	expect(pastWithComment.status).toBe(200);
});

test.afterAll(async () => {
	// 77-approvals-gaps judges what was seen, each gap in its own case.
	writeFileSync(APPROVALS_SEEN_FILE, JSON.stringify(seen, null, 1));
	const admin = await signIn("admin");
	if (state.flowId) await admin.delete(`~/approval-flows/${state.flowId}`);
	if (state.leaveFlowId) await admin.delete(`~/approval-flows/${state.leaveFlowId}`);
	if (state.leaveAssignmentId) await admin.delete(`~/access-role-assignments/${state.leaveAssignmentId}`);
});
