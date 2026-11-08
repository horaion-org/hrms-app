import { expect, test } from "@playwright/test";

import { ApiClient, expectStatus, rowsOf } from "./support/api";
import { readAccounts } from "./support/environment";
import { readSeed } from "./support/seed-data";
import { departmentPath } from "./support/schedules";
import { actual, openAs, screen, settle } from "./support/ui";

/** Flow 1: Settings — scheduling policy, leave types, employment terms; run as admin and as HR. */

const seed = readSeed();
const accounts = readAccounts();
const signIn = async (role: "admin" | "hr" | "manager") => (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);

test("E2E-001 a department rule looser than a locked company floor is refused", async ({ browser }, testInfo) => {
	const admin = await signIn("admin");
	const looser = await admin.post(`${departmentPath(seed, seed.departments.operations)}/constraints`, {
		name: "Short rest",
		type: "REST_BETWEEN_SHIFTS",
		status: "ACTIVE",
		values: [{ field: "REST_HOURS", value: "8" }],
		overridesConstraintId: seed.policyConstraintId,
	});
	actual(testInfo, `override 8 h under a locked 11 h floor → ${looser.status} ${looser.errorCode}`);
	expect([400, 409, 422]).toContain(looser.status);
	expect(looser.errorCode).toMatch(/NOT_STRICTER|LOCK|INVALID_CONSTRAINT_OVERRIDE/);

	const page = await openAs(browser, "admin");
	await page.goto("/settings");
	await page.getByRole("tab", { name: "Scheduling" }).click();
	await settle(page);
	await expect(page.getByText("Rest between shifts").first()).toBeVisible();
	await screen(page, testInfo, "E2E-001", "settings-scheduling-policy");
});

test("E2E-002 a policy rule's type cannot change on edit", async ({ browser }, testInfo) => {
	const admin = await signIn("admin");
	const changed = await admin.put(`~/scheduling-policy/constraints/${seed.policyConstraintId}`, {
		name: "Rest between shifts",
		type: "DAYS_OFF_PER_PERIOD",
		requirement: "MUST",
		status: "ACTIVE",
		lock: "LOCKED",
		values: [
			{ field: "COMPARISON", value: "AT_LEAST" },
			{ field: "DAYS_OFF", value: "1" },
			{ field: "PERIOD_DAYS", value: "7" },
		],
	});
	actual(testInfo, `PUT with another type → ${changed.status} ${changed.errorCode}`);
	expect(changed.status).toBeGreaterThanOrEqual(400);
	expect(changed.errorCode).toBe("CONSTRAINT_TYPE_FIXED");

	const page = await openAs(browser, "admin");
	await page.goto("/settings");
	await page.getByRole("tab", { name: "Scheduling" }).click();
	await settle(page);
	await page.getByRole("row", { name: /Rest between shifts/ }).getByRole("button", { name: /edit/i }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await settle(page);
	await screen(page, testInfo, "E2E-002", "edit-policy-rule");
	const typeControl = dialog.getByRole("button", { name: /constraint type|^type/i }).or(dialog.getByLabel(/constraint type|^type/i));
	const typeControlCount = await typeControl.count();
	const disabled = typeControlCount ? await typeControl.first().isDisabled() : null;
	actual(testInfo, `edit dialog type control: ${typeControlCount ? (disabled ? "disabled" : "ENABLED") : "not shown as a control"}`);
	if (typeControlCount) expect(disabled).toBe(true);
});

test("E2E-003 HR creates, renames and deactivates a leave type; HR has no scheduling", async ({ browser }, testInfo) => {
	const hr = await signIn("hr");
	const created = expectStatus(await hr.post("~/leave-types", { name: "Exam leave", grantKind: "ALLOWANCE", paid: false, requiresReason: true }), 201, "create leave type");
	const renamed = expectStatus(
		await hr.put(`~/leave-types/${created.leaveTypeId}`, { name: "Exam day", grantKind: "ALLOWANCE", paid: false, requiresReason: true, status: "ACTIVE" }),
		200,
		"rename leave type"
	);
	const deactivated = expectStatus(
		await hr.put(`~/leave-types/${created.leaveTypeId}`, { name: "Exam day", grantKind: "ALLOWANCE", paid: false, requiresReason: true, status: "INACTIVE" }),
		200,
		"deactivate leave type"
	);
	const offered = rowsOf((await hr.get("~/me/leave-types?status=ACTIVE")).data).map((type: any) => type.name);
	const schedules = await hr.get("~/schedules");
	actual(testInfo, `created → renamed "${renamed.name}" → ${deactivated.status}; offered to members: ${offered.includes("Exam day") ? "yes" : "no"}; HR GET schedules → ${schedules.status}`);
	expect(deactivated.status).toBe("INACTIVE");
	expect(offered).not.toContain("Exam day");
	expect(schedules.status).toBe(403);

	const page = await openAs(browser, "hr");
	await page.goto("/settings");
	await page.getByRole("tab", { name: "Leave" }).click();
	await settle(page);
	await screen(page, testInfo, "E2E-003", "hr-settings-leave-types");
	await expect(page.getByText("Exam day").first()).toBeVisible();
	const navigation = page.getByRole("navigation", { name: "Main navigation" });
	const scheduling = await navigation.getByRole("link", { name: "Scheduling" }).count();
	actual(testInfo, `HR navigation shows Scheduling: ${scheduling > 0}`);
});

test("E2E-004 employment terms: Default exists, a dated entry for one person, every member has a current entry", async ({ browser }, testInfo) => {
	const admin = await signIn("admin");
	const terms = (await admin.get("~/employment-terms")).data;
	const list = terms?.terms ?? rowsOf(terms);
	const defaults = list.filter((entry: any) => entry.isDefault);
	const withoutCurrent: string[] = [];
	for (const member of seed.members) {
		const entry = (await admin.get(`~/member-profiles/${member.membershipId}/employment-terms`)).data;
		if (!entry?.inForce) withoutCurrent.push(member.name);
	}
	const dated = (await admin.get(`~/member-profiles/${seed.members.find((member) => member.key === "p7")!.membershipId}/employment-terms`)).data;
	actual(testInfo, `defaults: ${defaults.map((entry: any) => entry.name).join(", ")}; Priya in force: ${dated.inForce?.name} since ${dated.inForce?.since}; members without a current entry: ${withoutCurrent.length ? withoutCurrent.join(", ") : "none"}`);
	expect(defaults).toHaveLength(1);
	expect(dated.inForce?.name).toBe("Part-time 3 days");
	expect(dated.inForce?.since).toBe("2026-11-02");
	expect(withoutCurrent).toEqual([]);

	const page = await openAs(browser, "admin");
	await page.goto("/settings");
	await page.getByRole("tab", { name: "Employment" }).click();
	await settle(page);
	await screen(page, testInfo, "E2E-004", "settings-employment-terms");
	await page.goto(`/people/${seed.members.find((member) => member.key === "p7")!.membershipId}`);
	await settle(page);
	await screen(page, testInfo, "E2E-004", "profile-dated-terms");
});

test("E2E-005 HR changes a member's terms; the department manager cannot", async ({}, testInfo) => {
	const hr = await signIn("hr");
	const manager = await signIn("manager");
	const member = seed.members.find((candidate) => candidate.key === "p6")!;
	const body = { employmentTermsId: seed.termsIds.partTime, effectiveFrom: "2026-12-07", contractedWeekMinutes: null, contractedDayMinutes: null };
	const byManager = await manager.post(`~/member-profiles/${member.membershipId}/employment-terms`, body);
	const byHr = await hr.post(`~/member-profiles/${member.membershipId}/employment-terms`, body);
	actual(testInfo, `manager → ${byManager.status}; HR → ${byHr.status}`);
	expect(byManager.status).toBe(403);
	expect(byHr.status).toBe(201);
});
