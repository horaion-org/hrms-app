import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { ApiClient, rowsOf } from "./support/api";
import { queryRows } from "./support/database";
import { readAccounts, RUN_DIRECTORY } from "./support/environment";
import { readSeed } from "./support/seed-data";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Re-checks the 2026-11-08 defects that no flow case already covers: D-01 (generation ignores employment terms),
 * D-05 (390 px sidebar), D-07 (two /me routes without the envelope), D-08 (View setup reads as Create), D-09 (unknown
 * notification logged at ERROR) and D-10 (English default leave type names). D-02, D-03, D-04 and D-06 are covered by
 * E2E-002, E2E-120 and E2E-110. Each case passes when the defect no longer reproduces.
 */

const seed = readSeed();
const accounts = readAccounts();
const BACKEND_LOG = process.env["E2E_BACKEND_LOG"] ?? `${RUN_DIRECTORY}/run/backend.log`;
const signIn = async (role: "admin" | "worker") => (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);

test("E2E-160 D-01: generated weeks follow employment terms (full-timers get a rest day; the part-timer is snapshotted as part-time)", async ({}, testInfo) => {
	const rows = queryRows(
		`SELECT s.name, c.display_name, c.employment_type,
		        count(*) FILTER (WHERE NOT a.is_off) AS shifts, count(*) FILTER (WHERE a.is_off) AS off
		 FROM schedule_assignments a
		 JOIN schedules s ON s.id = a.schedule_id
		 JOIN schedule_member_contexts c ON c.schedule_id = a.schedule_id AND c.member_profile_id = a.member_profile_id
		 WHERE s.name IN ('Ops week 48', 'Ops week 49') AND s.deleted_at IS NULL
		 GROUP BY 1, 2, 3 ORDER BY 1, 2`
	);
	const sevenOfSeven = rows.filter((row) => row["shifts"] === "7").map((row) => `${row["name"]}: ${row["display_name"]}`);
	const priya = rows.filter((row) => row["display_name"] === "Priya Officer").map((row) => `${row["name"]} ${row["employment_type"]} ${row["shifts"]} shifts`);
	actual(testInfo, `7 shifts / 0 days off: ${sevenOfSeven.join(", ") || "none"}; Priya (Part-time 3 days terms): ${priya.join("; ") || "not on these weeks"}`);
	expect(sevenOfSeven).toEqual([]);
});

test("E2E-161 D-05: at 390 px the page is not pushed below a full-height sidebar", async ({ browser }, testInfo) => {
	const page = await openAs(browser, "manager", { width: 390, height: 844 });
	await page.goto("/scheduling");
	await settle(page);
	const heading = await page.getByRole("heading", { level: 1 }).first().boundingBox();
	await screen(page, testInfo, "E2E-161", "1-390-scheduling");
	actual(testInfo, `first page heading starts at y=${Math.round(heading?.y ?? -1)} px on an 844 px screen`);
	expect(heading?.y ?? 9_999).toBeLessThan(844);
});

test("E2E-162 D-07: /me/notifications, /me/leave-requests/rostered-days and /me/leave-requests/{id} answer the {success, data} envelope", async ({}, testInfo) => {
	const worker = await signIn("worker");
	const notifications = await worker.get("~/me/notifications?page=0&size=5");
	const rostered = await worker.get("~/me/leave-requests/rostered-days?startDate=2026-11-16&endDate=2026-11-22");
	const ownLeave = rowsOf((await worker.get("~/me/leave-requests?page=0&size=1")).data)[0];
	const oneLeave = ownLeave ? await worker.get(`~/me/leave-requests/${ownLeave.leaveRequestId}`) : undefined;
	const shape = (body: any) => (body && typeof body === "object" && "success" in body ? "envelope" : Array.isArray(body) ? "bare list" : "bare object");
	actual(testInfo, `notifications ${notifications.status} ${shape(notifications.body)}; rostered-days ${rostered.status} ${shape(rostered.body)}; one own leave request ${oneLeave?.status} ${oneLeave ? shape(oneLeave.body) : "(none to read)"}`);
	expect.soft(shape(oneLeave?.body)).toBe("envelope");
	expect(shape(notifications.body)).toBe("envelope");
	expect(shape(rostered.body)).toBe("envelope");
});

test("E2E-163 D-08: View setup on a generated schedule does not read as 'Create schedule'", async ({ browser }, testInfo) => {
	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${seed.schedules.published}`);
	await settle(page);
	await page.getByRole("button", { name: /More actions for/ }).click();
	await page.getByRole("menuitem", { name: "View setup" }).click();
	await settle(page);
	const title = (await page.getByRole("heading", { level: 1 }).first().innerText()).trim();
	const newSchedule = await page.getByText(/your new schedule/).count();
	await screen(page, testInfo, "E2E-163", "1-view-setup");
	actual(testInfo, `title "${title}"; "your new schedule" ${newSchedule}`);
	expect(title).not.toBe("Create schedule");
	expect(newSchedule).toBe(0);
});

test("E2E-164 D-09: a 404 for an unknown notification is not logged at ERROR", async ({}, testInfo) => {
	const worker = await signIn("worker");
	const before = readFileSync(BACKEND_LOG, "utf8").length;
	const answer = await worker.put(`~/me/notifications/${crypto.randomUUID()}/read`);
	await new Promise((resolve) => setTimeout(resolve, 1_500));
	const added = readFileSync(BACKEND_LOG, "utf8").slice(before);
	// The log is coloured: strip the ANSI codes before looking for the level.
	// eslint-disable-next-line no-control-regex
	const errorLines = added.split("\n").map((line) => line.replace(/\u001b\[[0-9;]*m/g, "")).filter((line) => /\sERROR\s/.test(line));
	actual(testInfo, `answer ${answer.status} ${answer.errorCode ?? ""}; new ERROR lines ${errorLines.length}${errorLines[0] ? `: ${errorLines[0].slice(0, 200)}` : ""}`);
	expect(answer.status).toBe(404);
	expect(errorLines).toEqual([]);
});

test("E2E-165 D-10: a Spanish UI does not show the default leave types in English", async ({ browser }, testInfo) => {
	const admin = await signIn("admin");
	const types = rowsOf((await admin.get("~/leave-types?page=0&size=50")).data).map((type: any) => type.name);
	const page = await openAs(browser, "admin", undefined, "es-ES");
	await page.goto("/settings?section=leave");
	await settle(page);
	const english = await page.getByText(/^(Annual leave|Sick leave|Hospitalisation leave)$/).count();
	await screen(page, testInfo, "E2E-165", "1-leave-types-es");
	actual(testInfo, `leave types: ${types.join(", ")}; English default names on the Spanish screen: ${english}`);
	expect(english).toBe(0);
});
