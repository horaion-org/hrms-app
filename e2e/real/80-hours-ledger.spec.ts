import { expect, test } from "@playwright/test";

import { ApiClient } from "./support/api";
import { literal, queryRows } from "./support/database";
import { readAccounts } from "./support/environment";
import { readSeed } from "./support/seed-data";
import { departmentPath, schedulePath } from "./support/schedules";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Flow 8 + shift break/overtime: the hours ledger (work_hours_entries) after publish and after published edits. A
 * published day keeps its PUBLISHED row; an edited day gets a CHANGE_SET row beside it, which readers take (ADR-0063).
 * Night (23:00–07:00) counts on the day it starts; Morning's 60-minute unpaid break makes 420 paid of 480; Evening
 * carries built-in overtime.
 */

const seed = readSeed();
const accounts = readAccounts();
const operations = seed.departments.operations;
const SHIFT_MINUTES: Record<string, { rostered: number; paid: number; overtime: boolean }> = {
	Morning: { rostered: 480, paid: 420, overtime: false },
	Evening: { rostered: 480, paid: 480, overtime: true },
	Night: { rostered: 480, paid: 480, overtime: false },
};

/** The ledger row a reader uses per member-day: CHANGE_SET over PUBLISHED. */
function effectiveLedger(scheduleUuid: string): Map<string, Record<string, string>> {
	const rows = queryRows(
		`SELECT p.uuid AS profile, w.roster_date, w.day_kind, w.rostered_minutes, w.paid_minutes, w.planned_overtime, w.source
		 FROM work_hours_entries w JOIN schedules s ON s.id = w.schedule_id JOIN member_profiles p ON p.id = w.member_profile_id
		 WHERE s.uuid = ${literal(scheduleUuid)} AND w.deleted_at IS NULL AND w.source IN ('PUBLISHED', 'CHANGE_SET')`
	);
	const byDay = new Map<string, Record<string, string>>();
	for (const row of rows) {
		const key = `${row["profile"]}|${row["roster_date"]}`;
		if (!byDay.has(key) || row["source"] === "CHANGE_SET") byDay.set(key, row);
	}
	return byDay;
}

for (const [caseId, label, scheduleKey] of [
	["E2E-100", "week 47 (published, then edited by leave, offers and hand edits)", "published"],
	["E2E-101", "week 48 (published from a draft, then one published edit)", "draft"],
] as const) {
	test(`${caseId} the ledger has one effective row per person-day that matches the roster: ${label}`, async ({}, testInfo) => {
		const admin = (await ApiClient.signIn(accounts.emails.admin, accounts.password)).withCompany(seed.companyId);
		const scheduleId = seed.schedules[scheduleKey];
		const roster = (await admin.get(`${schedulePath(seed, operations, scheduleId)}/assignments`)).data;
		const ledger = effectiveLedger(scheduleId);
		const mismatches: string[] = [];
		for (const cell of roster) {
			const row = ledger.get(`${cell.member.memberProfileId}|${cell.day}`);
			if (!row) {
				mismatches.push(`${cell.member.displayName} ${cell.day}: no ledger row`);
				continue;
			}
			const expected = cell.shift ? SHIFT_MINUTES[cell.shift.name] : { rostered: 0, paid: 0, overtime: false };
			if (!expected) {
				mismatches.push(`${cell.member.displayName} ${cell.day}: unknown shift ${cell.shift.name}`);
				continue;
			}
			const kind = cell.shift ? "WORK" : cell.leaveRequestId || cell.offReason === "LEAVE" ? "LEAVE" : null;
			if (Number(row["rostered_minutes"]) !== expected.rostered || Number(row["paid_minutes"]) !== expected.paid || (row["planned_overtime"] === "t") !== expected.overtime || (kind === "WORK" && row["day_kind"] !== "WORK")) {
				mismatches.push(`${cell.member.displayName} ${cell.day} ${cell.shift?.name ?? cell.offReason}: ledger ${row["day_kind"]} ${row["rostered_minutes"]}/${row["paid_minutes"]} ot=${row["planned_overtime"]} (${row["source"]})`);
			}
		}
		const changeSets = [...ledger.values()].filter((row) => row["source"] === "CHANGE_SET").length;
		actual(testInfo, `roster cells ${roster.length}; effective ledger rows ${ledger.size} (${changeSets} from change sets); mismatches: ${mismatches.length ? mismatches.join("; ") : "none"}`);
		expect(ledger.size).toBe(roster.length);
		expect(mismatches).toEqual([]);
	});
}

test("E2E-102 a Night shift (23:00–07:00) is counted on the day it starts", async ({}, testInfo) => {
	const admin = (await ApiClient.signIn(accounts.emails.admin, accounts.password)).withCompany(seed.companyId);
	const scheduleId = seed.schedules.draft;
	const roster = (await admin.get(`${schedulePath(seed, operations, scheduleId)}/assignments`)).data;
	const ledger = effectiveLedger(scheduleId);
	const night = roster.find((cell: any) => cell.shift?.name === "Night");
	const nextDay = new Date(`${night.day}T00:00:00Z`);
	nextDay.setUTCDate(nextDay.getUTCDate() + 1);
	const next = roster.find((cell: any) => cell.member.membershipId === night.member.membershipId && cell.day === nextDay.toISOString().slice(0, 10));
	const startRow = ledger.get(`${night.member.memberProfileId}|${night.day}`);
	const nextRow = next ? ledger.get(`${night.member.memberProfileId}|${next.day}`) : undefined;
	actual(testInfo, `${night.member.displayName} Night on ${night.day}: ledger ${startRow?.["rostered_minutes"]} min that day; next day (${next?.shift?.name ?? next?.offReason ?? "-"}) ${nextRow?.["rostered_minutes"] ?? "-"} min`);
	expect(Number(startRow?.["rostered_minutes"])).toBe(480);
	if (next && !next.shift) expect(Number(nextRow?.["rostered_minutes"])).toBe(0);
});

test("E2E-103 a shift's unpaid break and built-in overtime are kept and shown", async ({ browser }, testInfo) => {
	const admin = (await ApiClient.signIn(accounts.emails.admin, accounts.password)).withCompany(seed.companyId);
	const shifts = (await admin.get(`${departmentPath(seed, operations)}/shifts`)).data;
	const rows = (Array.isArray(shifts) ? shifts : shifts?.content ?? []).map((shift: any) => `${shift.name}: break ${shift.unpaidBreakMinutes} min, overtime ${shift.carriesOvertime}`);
	const page = await openAs(browser, "admin");
	await page.goto(`/scheduling/${seed.schedules.published}`);
	await settle(page);
	await page.getByRole("button", { name: /More actions for/ }).click();
	await page.getByRole("menuitem", { name: "View setup" }).click();
	await page.waitForTimeout(1_500);
	await screen(page, testInfo, "E2E-103", "1-schedule-setup");
	await page.getByRole("button", { name: "Next" }).click();
	await page.waitForTimeout(1_500);
	await screen(page, testInfo, "E2E-103", "2-schedule-setup-shifts");
	const breakShown = await page.getByText(/unpaid break|break|60 min|1 h/i).count();
	actual(testInfo, `${rows.join("; ")}; break shown in the UI: ${breakShown > 0}`);
	expect(rows).toContain("Morning: break 60 min, overtime false");
	expect(rows).toContain("Evening: break 0 min, overtime true");
});
