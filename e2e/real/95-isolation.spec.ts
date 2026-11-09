import { expect, test } from "@playwright/test";

import { ApiClient, rowsOf } from "./support/api";
import { literal, queryRows } from "./support/database";
import { COMPANY_A_ROLES, readAccounts } from "./support/environment";
import { readSeed } from "./support/seed-data";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Data isolation between company A (everything the flows did) and company B (ownerB's small company). The matrix
 * already scanned every successful answer for the other company's identifiers; this adds counts, the audit trail,
 * notifications and the UI.
 */

const seed = readSeed();
const accounts = readAccounts();
const A_MARKERS = [seed.companyId, seed.branchId, seed.departments.operations, seed.departments.support, "E2E Security Co", "Wan Worker", "Mia Manager"];
const B_MARKERS = [seed.companyB.companyId, seed.companyB.branchId, seed.companyB.departmentId, "E2E Other Co", "Bo Patroller", "Harbour", "Patrol"];
const LISTS = ["~/member-profiles?page=0&size=100", "~/schedules?page=0&size=100", "~/leave-requests?page=0&size=100", "~/branches", "~/departments", "~/job-titles", "~/access-roles?page=0&size=100", "~/leave-types", "~/employment-terms", "~/audit-events?page=0&size=100", "~/me/notifications?page=0&size=100", "~/me/notifications/unread-count", "~/skill-overview"];

test("E2E-130 company B's owner sees only company B in every list and count", async ({ browser }, testInfo) => {
	const ownerB = (await ApiClient.signIn(accounts.emails.ownerB, accounts.password)).withCompany(seed.companyB.companyId);
	const lines: string[] = [];
	const leaks: string[] = [];
	for (const list of LISTS) {
		const answer = await ownerB.get(list);
		const leak = A_MARKERS.find((marker) => answer.text.includes(marker));
		lines.push(`${list.split("?")[0]} ${answer.status}${Array.isArray(rowsOf(answer.data ?? answer.body)) ? ` (${rowsOf(answer.data ?? answer.body).length})` : ""}`);
		if (leak) leaks.push(`${list} names ${leak}`);
	}
	const members = rowsOf((await ownerB.get("~/member-profiles?page=0&size=100")).data).length;
	const page = await openAs(browser, "ownerB");
	await page.goto("/people");
	await settle(page);
	await screen(page, testInfo, "E2E-130", "ownerB-people");
	const uiLeak = await page.getByText(/Wan Worker|Mia Manager|E2E Security Co/).count();
	actual(testInfo, `${lines.join("; ")}; members ${members}; leaks: ${leaks.length ? leaks.join("; ") : "none"}; company A names in ownerB's People page: ${uiLeak}`);
	expect(leaks).toEqual([]);
	expect(members).toBe(2);
	expect(uiLeak).toBe(0);
});

test("E2E-131 no company A user type sees company B in any list or count", async ({}, testInfo) => {
	const leaks: string[] = [];
	for (const role of COMPANY_A_ROLES) {
		const client = (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);
		for (const list of LISTS) {
			const answer = await client.get(list);
			const leak = B_MARKERS.find((marker) => answer.text.includes(marker));
			if (leak) leaks.push(`${role} ${list} names ${leak}`);
		}
		const workspace = await client.get("/api/v1/me/workspace");
		if (B_MARKERS.some((marker) => workspace.text.includes(marker))) leaks.push(`${role} workspace lists company B`);
	}
	actual(testInfo, `${COMPANY_A_ROLES.length} user types × ${LISTS.length + 1} reads; leaks: ${leaks.length ? leaks.join("; ") : "none"}`);
	expect(leaks).toEqual([]);
});

test("E2E-132 the audit trail and notifications never cross companies", async ({}, testInfo) => {
	const ownerBSub = (await ApiClient.signIn(accounts.emails.ownerB, accounts.password)).subject();
	const successInA = queryRows(`SELECT count(*) AS rows FROM audit_events WHERE company_uuid = ${literal(seed.companyId)} AND actor_sub = ${literal(ownerBSub)} AND outcome = 'SUCCESS'`)[0]?.["rows"];
	const deniedInA = queryRows(`SELECT count(*) AS rows FROM audit_events WHERE company_uuid = ${literal(seed.companyId)} AND actor_sub = ${literal(ownerBSub)} AND outcome = 'DENIED'`)[0]?.["rows"];
	const crossDeliveries = queryRows(
		"SELECT count(*) AS rows FROM notifications n JOIN notification_events e ON e.id = n.event_id JOIN company_memberships m ON m.id = n.recipient_membership_id WHERE m.company_id <> e.company_id"
	)[0]?.["rows"];
	const ownerB = (await ApiClient.signIn(accounts.emails.ownerB, accounts.password)).withCompany(seed.companyB.companyId);
	const unread = await ownerB.get("~/me/notifications/unread-count");
	const bInbox = queryRows(
		`SELECT count(*) AS rows FROM notifications n JOIN company_memberships m ON m.id = n.recipient_membership_id JOIN companies c ON c.id = m.company_id WHERE c.uuid = ${literal(seed.companyB.companyId)} AND n.read_at IS NULL AND n.deleted_at IS NULL`
	)[0]?.["rows"];
	actual(testInfo, `ownerB SUCCESS audit rows in company A: ${successInA}; DENIED rows (the matrix's attempts): ${deniedInA}; cross-company deliveries: ${crossDeliveries}; ownerB unread-count ${JSON.stringify(unread.data ?? unread.body)} vs company B unread in DB ${bInbox}`);
	expect(Number(successInA)).toBe(0);
	expect(Number(crossDeliveries)).toBe(0);
});
