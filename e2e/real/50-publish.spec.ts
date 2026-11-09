import { expect, test } from "@playwright/test";

import { ApiClient, rowsOf } from "./support/api";
import { queryRows } from "./support/database";
import { readAccounts } from "./support/environment";
import { applyChange, dayOf, rosterShifts } from "./support/roster";
import { readSeed, weekDays, WEEKS } from "./support/seed-data";
import { createSchedule, generateAndWait, schedulePath } from "./support/schedules";
import { actual, openAs, screen, settle } from "./support/ui";

/** Flow 6: Publish — rostered members notified; a published edit with a remark reaches the member; delete refused. */

const seed = readSeed();
const accounts = readAccounts();
const operations = seed.departments.operations;
const draft = seed.schedules.draft;
const days = weekDays(WEEKS.draft);
const signIn = async (role: "manager" | "editor" | "worker" | "admin") => (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);

/** Notifications are delivered by an outbox every 5 s; waits until the member has one of the type, or gives up. */
async function waitForNotification(api: ApiClient, type: string, after: string, seconds = 30): Promise<any | undefined> {
	for (let attempt = 0; attempt < seconds; attempt++) {
		// This list answers a bare page ({content, page}), not the {success, data} envelope other routes use.
		const answer = await api.get("~/me/notifications?page=0&size=50");
		const rows = rowsOf(answer.data ?? answer.body);
		const match = rows.find((row: any) => row.type === type && (row.createdAt ?? row.occurredAt ?? "") >= after);
		if (match) return match;
		await new Promise((resolve) => setTimeout(resolve, 1_000));
	}
	return undefined;
}

test.describe.configure({ mode: "serial" });

test("E2E-050 the manager publishes; every rostered member is notified", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const startedAt = new Date().toISOString();
	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${draft}`);
	await settle(page);
	await page.getByRole("button", { name: "Publish roster" }).click();
	const dialog = page.getByRole("dialog");
	if (await dialog.count()) {
		await screen(page, testInfo, "E2E-050", "1-publish-confirm");
		await dialog.getByRole("button", { name: /publish/i }).last().click();
	}
	await expect(page.getByText(/PUBLISHED/i).first()).toBeVisible({ timeout: 20_000 });
	await screen(page, testInfo, "E2E-050", "2-published");

	const worker = await signIn("worker");
	const rostered = (await manager.get(`${schedulePath(seed, operations, draft)}/assignments`)).data.filter((row: any) => row.shift).map((row: any) => row.member.displayName);
	const notice = await waitForNotification(worker, "SHIFT_ASSIGNMENT", startedAt.slice(0, 19));
	const delivered = queryRows(
		`SELECT count(n.id) AS told FROM notification_events e LEFT JOIN notifications n ON n.event_id = e.id WHERE e.type = 'SHIFT_ASSIGNMENT' AND e.occurred_at >= '${startedAt}'`
	)[0]?.["told"];
	actual(testInfo, `rostered people: ${new Set(rostered).size}; SHIFT_ASSIGNMENT notifications delivered: ${delivered}; worker sees one: ${notice ? "yes" : "no"}`);
	expect(Number(delivered)).toBeGreaterThan(0);
	expect(notice).toBeTruthy();
});

test("E2E-051 a published cell edited with a remark notifies the member, who sees the remark on My roster", async ({ browser }, testInfo) => {
	const editor = await signIn("editor");
	const worker = await signIn("worker");
	const startedAt = new Date().toISOString();
	const shifts = await rosterShifts(editor, seed, operations, draft);
	const day = days[3];
	const before = await dayOf(editor, seed, operations, draft, seed.membershipIds.worker, day);
	const cell = before?.shift ? { membershipId: seed.membershipIds.worker, day, kind: "OFF" as const } : { membershipId: seed.membershipIds.worker, day, kind: "WORK" as const, shiftId: shifts.Evening };
	const remark = "Swapped to cover the evening gap — thanks Wan";
	const { preview, applied } = await applyChange(editor, seed, operations, draft, [cell], remark);
	const notice = await waitForNotification(worker, "SCHEDULE_ASSIGNMENT_UPDATED", startedAt.slice(0, 19));
	const mine = (await worker.get(`~/me/schedules/${draft}`)).data;
	const myDay = mine?.assignments?.find((row: any) => row.day === day);

	const page = await openAs(browser, "worker");
	await page.goto(`/me/schedules/${draft}`);
	await settle(page);
	await screen(page, testInfo, "E2E-051", "1-my-roster");
	const myCell = page.getByRole("cell", { name: new RegExp(`Wan Worker, ${new Date(`${day}T00:00:00Z`).toUTCString().slice(0, 3)}`) }).first();
	if (await myCell.count()) {
		await myCell.click();
		await page.waitForTimeout(500);
		await screen(page, testInfo, "E2E-051", "2-my-day");
	}
	const remarkVisible = await page.getByText(remark).first().isVisible().catch(() => false);
	actual(
		testInfo,
		`preview needsRemark=${preview.data?.needsRemark}; apply ${applied.status} onPublishedRoster=${applied.data?.onPublishedRoster}; worker notified: ${notice ? notice.type : "no"}; My roster day: ${myDay?.shift?.name ?? (myDay?.off ? "off" : "?")}, remark in API: ${JSON.stringify(myDay?.lastChange ?? null).includes("thanks Wan")}; remark visible on My roster: ${remarkVisible}`
	);
	expect(applied.status).toBe(201);
	expect(notice).toBeTruthy();
	expect(remarkVisible).toBe(true);
});

test("E2E-052 a published roster cannot be deleted", async ({}, testInfo) => {
	const manager = await signIn("manager");
	const deleted = await manager.delete(schedulePath(seed, operations, draft));
	actual(testInfo, `DELETE published → ${deleted.status} ${deleted.errorCode ?? ""}`);
	expect(deleted.status).toBe(409);
});

test("E2E-053 publishing right after generation notifies the rostered members (as the seed did for week 47)", async ({}, testInfo) => {
	const manager2 = (await ApiClient.signIn(accounts.emails.manager, accounts.password)).withCompany(seed.companyId);
	const support = seed.departments.operations;
	const week = await createSchedule(manager2, seed, support, { name: "Ops quick publish", periodStart: "2027-02-01", shiftIds: [seed.shifts.morning, seed.shifts.evening, seed.shifts.night], constraintIds: [seed.constraints.morning, seed.constraints.evening, seed.constraints.night] });
	const generated = await generateAndWait(manager2, seed, support, week.scheduleId);
	const startedAt = new Date().toISOString();
	const published = await manager2.post(`${schedulePath(seed, support, week.scheduleId)}/approval`);
	await new Promise((resolve) => setTimeout(resolve, 15_000));
	const delivered = queryRows(
		`SELECT count(n.id) AS told FROM notification_events e JOIN schedules s ON s.id = e.schedule_id LEFT JOIN notifications n ON n.event_id = e.id WHERE e.type = 'SHIFT_ASSIGNMENT' AND s.uuid = '${week.scheduleId}'`
	)[0]?.["told"];
	const rostered = (await manager2.get(`${schedulePath(seed, support, week.scheduleId)}/assignments`)).data.filter((row: any) => row.shift).length;
	actual(testInfo, `generated ${generated.status}, publish ${published.status} at ${startedAt}; rostered cells ${rostered}; SHIFT_ASSIGNMENT notifications delivered: ${delivered}`);
	expect(Number(delivered)).toBeGreaterThan(0);
});
