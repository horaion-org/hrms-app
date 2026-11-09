import { expect, test } from "@playwright/test";

import { ApiClient, expectStatus, rowsOf } from "./support/api";
import { readAccounts, type Role } from "./support/environment";
import { addDays, readSeed, WEEKS } from "./support/seed-data";
import { departmentPath } from "./support/schedules";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Leave under an approval flow, in the app (ux note 2026-11-09 "approval flows for rosters and leave", phases 1–3).
 * The admin adds Operations' leave flow from Settings › Approvals › Leave requests: step 1 "HR check" (Hana), step 2
 * "Sign off" (the admin), a different person each step. The worker applies; their own request says which step it
 * waits on; Hana approves step 1 from Team requests; the admin sees the steps in the request and approves the last.
 * Hana is first given approval:read/decide with leave review at Operations, as a flow needs (G5).
 */

const seed = readSeed();
const accounts = readAccounts();
const operations = seed.departments.operations;
const signIn = async (role: Role) => (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);
const memberOf = (key: string) => seed.members.find((member) => member.key === key)!;
const state: { leaveFlowId?: string; roleId?: string; assignmentId?: string; leaveId?: string } = {};

test.describe.configure({ mode: "serial" });

test("E2E-150 Settings › Approvals: a leave flow is added from the Leave requests group, worded for leave, with a different person each step", async ({ browser }, testInfo) => {
	const admin = await signIn("admin");
	const hana = memberOf("hr");
	state.roleId = expectStatus(
		await admin.post("~/access-roles", {
			name: `Leave step approver ${Date.now().toString(36)}`,
			permissions: ["approval:read", "approval:decide", "leave_request:read", "leave_request:review"],
		}),
		201,
		"leave approver role"
	).accessRoleId;
	state.assignmentId = expectStatus(
		await admin.post(`${departmentPath(seed, operations)}/access-role-assignments`, { companyMembershipId: hana.membershipId, accessRoleId: state.roleId }),
		201,
		"assign leave approver"
	)?.accessRoleAssignmentId;

	const page = await openAs(browser, "admin");
	await page.goto("/settings?section=approvals&subject=leave");
	await settle(page);
	const emptyLine = await page.getByText("No approval flow. Leave is approved or rejected in one step, by anyone who can review it.").count();
	await screen(page, testInfo, "E2E-150", "1-leave-group-empty");
	await page.getByRole("button", { name: "Add flow Leave requests" }).click();
	const dialog = page.getByRole("dialog", { name: "Add leave approval flow" });
	await dialog.getByRole("button", { name: "Applies to" }).click();
	await page.getByRole("option", { name: "Central › Operations" }).click();
	const steps = dialog.getByRole("listitem").filter({ has: page.getByRole("heading", { name: /^Step \d$/ }) });
	await steps.nth(0).getByRole("textbox", { name: "Name of step 1" }).fill("HR check");
	await steps.nth(0).getByRole("radio", { name: "Only these people" }).check({ force: true });
	await steps.nth(0).getByRole("button", { name: "People" }).click();
	await page.getByRole("option", { name: hana.name }).click();
	await page.keyboard.press("Escape");
	await dialog.getByRole("button", { name: "Add step" }).click();
	await steps.nth(1).getByRole("textbox", { name: "Name of step 2" }).fill("Sign off");
	await steps.nth(1).getByRole("radio", { name: "Only these people" }).check({ force: true });
	await steps.nth(1).getByRole("button", { name: "People" }).click();
	await page.getByRole("option", { name: "Ada Admin" }).click();
	await page.keyboard.press("Escape");
	await dialog.getByRole("checkbox", { name: "A different person approves each step" }).check();
	const anyoneWording = await dialog.getByText(/Anyone who can review .*leave/).count();
	await screen(page, testInfo, "E2E-150", "2-add-leave-dialog");
	await dialog.getByRole("button", { name: "Save flow" }).click();
	await expect(page.getByText("Approval flow added.").first()).toBeVisible({ timeout: 15_000 });
	const leaveTable = page.getByRole("table", { name: "Leave requests" });
	const row = (await leaveTable.getByRole("row", { name: /Operations/ }).innerText()).replace(/\s+/g, " ");
	const fallback = await page.getByText("Other departments, and any whose flow is off: one step, by anyone who can review their leave.").count();
	await screen(page, testInfo, "E2E-150", "3-leave-flow-listed");

	const saved = rowsOf((await admin.get("~/approval-flows")).data).find((flow: any) => flow.subjectType === "LEAVE_REQUEST" && flow.departmentId === operations);
	state.leaveFlowId = saved?.approvalFlowId;
	actual(testInfo, `empty line ${emptyLine}; leave wording ${anyoneWording}; row "${row}"; fallback ${fallback}; saved ${saved?.subjectType} distinct ${saved?.distinctApprovers}`);
	expect(emptyLine).toBe(1);
	expect(row).toContain("1 HR check → 2 Sign off");
	expect(fallback).toBe(1);
	expect(saved?.distinctApprovers).toBe(true);
});

test("E2E-151 leave walks through its steps in the app: the worker sees the step, HR approves step 1 from Team requests, the admin sees the steps and approves the last", async ({ browser }, testInfo) => {
	test.skip(!state.leaveFlowId, "needs E2E-150's leave flow");
	const worker = await signIn("worker");
	const day = addDays(WEEKS.leaveFlow, 3);
	const applied = expectStatus(await worker.post("~/me/leave-requests", { leaveType: "ANNUAL", startDate: day, endDate: day, notes: "Through the flow in the app" }), 201, "worker applies");
	state.leaveId = applied.leaveRequestId;
	const workerName = memberOf("worker").name;

	const workerPage = await openAs(browser, "worker");
	await workerPage.goto("/leave");
	await settle(workerPage);
	const workerLine = await workerPage.getByText("Waiting for approval · step 1 of 2 (HR check)").count();
	await screen(workerPage, testInfo, "E2E-151", "1-worker-own-request");

	const hrPage = await openAs(browser, "hr");
	await hrPage.goto(`/leave?requestId=${state.leaveId}&memberId=${seed.membershipIds.worker}`);
	await settle(hrPage);
	const hrDialog = hrPage.getByRole("dialog", { name: "Leave request" });
	const hrSteps = (await hrDialog.getByRole("region", { name: "Approval" }).innerText()).replace(/\s+/g, " ");
	await screen(hrPage, testInfo, "E2E-151", "2-hr-request-at-step-1");
	await hrDialog.getByRole("button", { name: "Approve" }).click();
	const middleNote = await hrDialog.getByText("Step 1 of 2 (HR check). After you approve, the next step is asked.").count();
	await hrDialog.getByRole("button", { name: "Confirm approval" }).click();
	await settle(hrPage);

	const adminPage = await openAs(browser, "admin");
	await adminPage.goto(`/leave?requestId=${state.leaveId}&memberId=${seed.membershipIds.worker}`);
	await settle(adminPage);
	const adminDialog = adminPage.getByRole("dialog", { name: "Leave request" });
	const adminSteps = (await adminDialog.getByRole("region", { name: "Approval" }).innerText()).replace(/\s+/g, " ");
	await screen(adminPage, testInfo, "E2E-151", "3-admin-request-at-last-step");
	await adminDialog.getByRole("button", { name: "Approve" }).click();
	const lastNote = await adminDialog.getByText(`Last step (Sign off). Approving it approves ${workerName}’s leave, and they are told.`).count();
	const rostered = adminDialog.getByRole("checkbox");
	if (await rostered.count()) await rostered.check();
	await adminDialog.getByRole("button", { name: "Confirm approval" }).click();
	await settle(adminPage);

	const leaveAnswer = await worker.get(`~/me/leave-requests/${state.leaveId}`);
	const leave = leaveAnswer.data ?? leaveAnswer.body;
	actual(testInfo, `worker line ${workerLine}; HR sees "${hrSteps}", middle note ${middleNote}; admin sees "${adminSteps}", last note ${lastNote}; leave ${leave?.status}`);
	expect(workerLine).toBe(1);
	expect(hrSteps).toContain("HR check");
	expect(middleNote).toBe(1);
	expect(adminSteps).toContain("Approved");
	expect(lastNote).toBe(1);
	expect(leave?.status).toBe("APPROVED");
});

test.afterAll(async () => {
	const admin = await signIn("admin");
	if (state.leaveFlowId) await admin.delete(`~/approval-flows/${state.leaveFlowId}`);
	if (state.assignmentId) await admin.delete(`~/access-role-assignments/${state.assignmentId}`);
});
