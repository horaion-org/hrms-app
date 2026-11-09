import { expect, test } from "@playwright/test";

import { ApiClient, rowsOf } from "./support/api";
import { queryRows } from "./support/database";
import { COMPANY_A_ROLES, readAccounts, type Role } from "./support/environment";
import { readSeed } from "./support/seed-data";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * User types in the UI: what each one's navigation and key screens offer (hidden is presentation only; the matrix
 * proves the API refuses), and that each notification inbox holds only what that user may see.
 */

const seed = readSeed();
const accounts = readAccounts();
const NAV = ["Dashboard", "Scheduling", "Leave", "Availability", "People", "Organisation"];

/** Navigation each user type should get from its keys (Leave and Dashboard are every member's own). */
const EXPECTED_NAV: Record<Exclude<Role, "ownerB">, { shows: string[]; hides: string[] }> = {
	admin: { shows: NAV, hides: [] },
	manager: { shows: ["Scheduling", "Leave"], hides: ["People", "Organisation"] },
	manager2: { shows: ["Scheduling", "Leave"], hides: ["People", "Organisation"] },
	editor: { shows: ["Scheduling"], hides: ["People", "Organisation"] },
	hr: { shows: ["Leave"], hides: ["Scheduling", "People", "Organisation"] },
	approver: { shows: ["Scheduling"], hides: ["People", "Organisation"] },
	worker: { shows: ["Leave"], hides: ["Scheduling", "People", "Organisation"] },
};

test("E2E-120 each user type's navigation offers only what its keys open", async ({ browser }, testInfo) => {
	const findings: string[] = [];
	const seen: string[] = [];
	for (const role of COMPANY_A_ROLES) {
		const page = await openAs(browser, role);
		await page.goto("/");
		await settle(page);
		await screen(page, testInfo, "E2E-120", role);
		const navigation = page.getByRole("navigation", { name: "Main navigation" });
		const shown: string[] = [];
		for (const item of NAV) if (await navigation.getByRole("link", { name: item }).count()) shown.push(item);
		seen.push(`${role}: ${shown.join(", ")}`);
		const expected = EXPECTED_NAV[role as Exclude<Role, "ownerB">];
		const missing = expected.shows.filter((item) => !shown.includes(item));
		const extra = expected.hides.filter((item) => shown.includes(item));
		if (missing.length || extra.length) findings.push(`${role} missing [${missing.join(", ")}] extra [${extra.join(", ")}]`);
		await page.context().close();
	}
	actual(testInfo, `${seen.join(" | ")}${findings.length ? ` — mismatches: ${findings.join("; ")}` : ""}`);
	expect(findings).toEqual([]);
});

test("E2E-121 screens behind keys: the other department's roster, settings tabs, edit and publish controls", async ({ browser }, testInfo) => {
	const lines: string[] = [];
	const failures: string[] = [];
	const rosterVisible = async (role: Role, scheduleId: string) => {
		const page = await openAs(browser, role);
		await page.goto(`/scheduling/${scheduleId}`);
		await settle(page);
		const visible = await page.getByRole("table", { name: "Roster" }).count();
		const names = await page.getByText("Eli Editor").count();
		await screen(page, testInfo, "E2E-121", `${role}-ops-roster`);
		const publish = await page.getByRole("button", { name: "Publish roster" }).count();
		let changeTo = 0;
		const cell = page.getByRole("button", { name: /Eli Editor, Mon/ }).first();
		if (await cell.count()) {
			await cell.click();
			await settle(page);
			changeTo = await page.getByRole("heading", { name: "Change to" }).count();
		}
		await page.context().close();
		return { visible: visible > 0 && names > 0, publish, changeTo };
	};
	for (const role of ["manager2", "worker", "hr"] as Role[]) {
		const result = await rosterVisible(role, seed.schedules.published);
		lines.push(`${role} on Operations' roster: ${result.visible ? "SHOWN" : "not shown"}`);
		if (result.visible) failures.push(`${role} can see Operations' roster`);
	}
	const editor = await rosterVisible("editor", seed.schedules.published);
	const approver = await rosterVisible("approver", seed.schedules.published);
	lines.push(`editor: roster ${editor.visible}, edit panel ${editor.changeTo > 0}`, `approver: roster ${approver.visible}, edit panel ${approver.changeTo > 0}`);
	if (!editor.visible || editor.changeTo === 0) failures.push("editor cannot edit Operations' roster");
	if (approver.changeTo > 0) failures.push("approver (no schedule:edit_shift) is offered roster edits");

	for (const role of ["manager", "hr", "admin"] as Role[]) {
		const page = await openAs(browser, role);
		await page.goto("/settings");
		await settle(page);
		const tabs = await page.getByRole("tablist", { name: "Settings sections" }).getByRole("tab").allInnerTexts();
		lines.push(`${role} settings tabs: ${tabs.map((tab) => tab.split("\n")[0]).join(", ")}`);
		await screen(page, testInfo, "E2E-121", `${role}-settings`);
		const has = (name: string) => tabs.some((tab) => tab.startsWith(name));
		if (role === "manager" && (has("Scheduling") || has("Leave") || has("Employment"))) failures.push("manager sees company settings tabs it holds no key for");
		if (role === "hr" && (!has("Leave") || !has("Employment") || has("Scheduling"))) failures.push("HR settings tabs do not match leave/terms keys");
		await page.context().close();
	}
	actual(testInfo, `${lines.join(" | ")}${failures.length ? ` — failures: ${failures.join("; ")}` : ""}`);
	expect(failures).toEqual([]);
});

test("E2E-122 every inbox holds only what its user may see", async ({}, testInfo) => {
	const admin = (await ApiClient.signIn(accounts.emails.admin, accounts.password)).withCompany(seed.companyId);
	const operationsSchedules = new Set(rowsOf((await admin.get(`~/schedules?departmentId=${seed.departments.operations}&page=0&size=100`)).data).map((row: any) => row.scheduleId));
	const supportSchedules = new Set(rowsOf((await admin.get(`~/schedules?departmentId=${seed.departments.support}&page=0&size=100`)).data).map((row: any) => row.scheduleId));
	const leaveDepartment = new Map(rowsOf((await admin.get("~/leave-requests?page=0&size=100")).data).map((row: any) => [row.leaveRequestId, row.departmentId]));
	const LEAVE_REVIEW = ["LEAVE_REQUEST_SUBMITTED"];
	const lines: string[] = [];
	const failures: string[] = [];
	for (const role of COMPANY_A_ROLES) {
		const client = (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);
		const answer = await client.get("~/me/notifications?page=0&size=100");
		const rows = rowsOf(answer.data ?? answer.body);
		const types = [...new Set(rows.map((row: any) => row.type))];
		lines.push(`${role}: ${rows.length} (${types.join(", ")})`);
		for (const row of rows) {
			const ownLeave = row.leaveRequestId && leaveDepartment.get(row.leaveRequestId) && row.type !== "LEAVE_REQUEST_SUBMITTED";
			if (LEAVE_REVIEW.includes(row.type) && ["editor", "approver", "worker"].includes(role)) failures.push(`${role} got ${row.type}`);
			if (role === "manager2" && row.scheduleId && operationsSchedules.has(row.scheduleId)) failures.push(`manager2 got ${row.type} for an Operations roster`);
			if (role === "manager" && row.scheduleId && supportSchedules.has(row.scheduleId)) failures.push(`manager got ${row.type} for a Support roster`);
			if (role === "manager2" && row.type === "LEAVE_REQUEST_SUBMITTED" && leaveDepartment.get(row.leaveRequestId) === seed.departments.operations) failures.push("manager2 got an Operations leave request");
			if (role === "editor" && !ownLeave && (row.leaveRequestId || row.remark?.match(/leave/i))) failures.push(`editor's ${row.type} carries leave detail`);
		}
	}
	const crossCompany = queryRows(
		"SELECT count(*) AS leaked FROM notifications n JOIN notification_events e ON e.id = n.event_id JOIN company_memberships m ON m.id = n.recipient_membership_id WHERE m.company_id <> e.company_id"
	)[0]?.["leaked"];
	actual(testInfo, `${lines.join(" | ")}; cross-company deliveries in the DB: ${crossCompany}${failures.length ? ` — failures: ${[...new Set(failures)].join("; ")}` : ""}`);
	expect(Number(crossCompany)).toBe(0);
	expect([...new Set(failures)]).toEqual([]);
});
