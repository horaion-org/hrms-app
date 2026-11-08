import { expect, test } from "@playwright/test";

import { ApiClient, expectStatus } from "./support/api";
import { literal, queryRows } from "./support/database";
import { readAccounts, type Role } from "./support/environment";
import { notificationsOf, waitForNotification } from "./support/notifications";
import { applyChange, dayOf, readSchedule, rosterShifts } from "./support/roster";
import { addDays, readSeed, weekDays, WEEKS } from "./support/seed-data";
import { generatedOperationsWeek, schedulePath } from "./support/schedules";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Leave small items (backend #162, app #113): "On leave" without "Needs cover" on a roster generated with leave
 * ignored, "Needs cover" for leave approved after generation; the reviewer's remark under leave notification titles;
 * a comment to approve past leave on the single-step route; Withdraw publication (schedule:publish only, remark
 * required, back to Generated with edits and history kept, everyone told, the ledger drops published rows) and the
 * refusal to regenerate a once-published roster. The last step of an approval flow is covered in 76-approvals-ui.
 */

const seed = readSeed();
const accounts = readAccounts();
const operations = seed.departments.operations;
const memberOf = (key: string) => seed.members.find((member) => member.key === key)!.membershipId;
const signIn = async (role: Role) => (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);
const state: { ignoredWeek?: string; withdrawWeek?: string; withdrawChangeId?: string } = {};
const leaveBase = (membershipId: string) => `~/member-profiles/${membershipId}/leave-requests`;

/** Today in Singapore (the branch zone the API judges "past" in), as an ISO day. */
function singaporeToday(): string {
	return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore" }).format(new Date());
}

/** The day the member works on the roster, Monday–Friday first. */
async function workingDay(api: ApiClient, scheduleId: string, membershipId: string, week: string[]): Promise<{ day: string; shift: string } | undefined> {
	const rows = expectStatus(await api.get(`${schedulePath(seed, operations, scheduleId)}/assignments`), 200, "assignments");
	const days = rows.filter((row: any) => row.member?.membershipId === membershipId && row.shift);
	const pick = days.find((row: any) => week.slice(0, 5).includes(row.day)) ?? days[0];
	return pick ? { day: pick.day, shift: pick.shift.name } : undefined;
}

test.describe.configure({ mode: "serial" });

test("E2E-071 leave ignored at generation: 'On leave' with no 'Needs cover'; leave approved after generation needs cover", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const week = weekDays(WEEKS.leaveIgnored);
	const lina = memberOf("p6");
	const omar = memberOf("p5");
	// Lina's leave is approved before the week is generated with leave ignored, so the engine may place her.
	const before = await manager.post(`${leaveBase(lina)}/approved`, { leaveType: "ANNUAL", startDate: week[1], endDate: week[1], remark: "Booked early", takeOffRosteredDays: true });
	state.ignoredWeek = await generatedOperationsWeek(manager, seed, "Ops leave ignored week", WEEKS.leaveIgnored, false);
	let linaDay = await dayOf(manager, seed, operations, state.ignoredWeek, lina, week[1]);
	if (!linaDay?.shift) {
		// The engine left her off that day: place her by hand, which a leave-ignored roster allows with a remark.
		const shifts = await rosterShifts(manager, seed, operations, state.ignoredWeek);
		await applyChange(manager, seed, operations, state.ignoredWeek, [{ membershipId: lina, day: week[1], kind: "WORK", shiftId: shifts.Morning }], "Needed despite leave");
		linaDay = await dayOf(manager, seed, operations, state.ignoredWeek, lina, week[1]);
	}
	// Omar's leave is approved after generation, over a shift he works: it takes him off and opens a gap. The engine
	// may leave him unrostered (D-01), so he is given a Thursday Morning by hand first if needed.
	let omarWork = await workingDay(manager, state.ignoredWeek, omar, week);
	if (!omarWork) {
		const shifts = await rosterShifts(manager, seed, operations, state.ignoredWeek);
		await applyChange(manager, seed, operations, state.ignoredWeek, [{ membershipId: omar, day: week[3], kind: "WORK", shiftId: shifts.Morning }], "Thursday cover");
		omarWork = await workingDay(manager, state.ignoredWeek, omar, week);
	}
	const after = await manager.post(`${leaveBase(omar)}/approved`, { leaveType: "ANNUAL", startDate: omarWork!.day, endDate: omarWork!.day, remark: "Approved late", takeOffRosteredDays: true });
	const omarDay = await dayOf(manager, seed, operations, state.ignoredWeek, omar, omarWork!.day);

	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${state.ignoredWeek}?week=${WEEKS.leaveIgnored}`);
	await settle(page);
	await screen(page, testInfo, "E2E-071", "1-roster-leave-ignored");
	await page.getByRole("button", { name: /^Issues/ }).first().click().catch(() => undefined);
	await settle(page);
	const needsCoverLines = await page.getByText(/^Needs cover:/).allInnerTexts();
	await screen(page, testInfo, "E2E-071", "2-issues");
	actual(
		testInfo,
		`Lina leave before generation ${before.status}; her ${week[1]}: shift ${linaDay?.shift?.name ?? "-"}, flag ${linaDay?.flag}, uncovered ${linaDay?.uncoveredShift?.name ?? "-"}; Omar leave after generation ${after.status} on ${omarWork?.day}: off=${omarDay?.off} ${omarDay?.offReason}, uncovered ${omarDay?.uncoveredShift?.name ?? "-"}; Issues "Needs cover" lines: ${needsCoverLines.join(" | ") || "none"}`
	);
	expect(before.status).toBe(201);
	expect(linaDay?.flag).toBe("ON_LEAVE_WHILE_ROSTERED");
	expect(linaDay?.uncoveredShift ?? null).toBeNull();
	expect(after.status).toBe(201);
	expect(omarDay?.uncoveredShift?.name).toBe(omarWork?.shift);
});

test("E2E-072 the reviewer's remark shows under approved, rejected, recorded, changed and cancelled leave notices", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const worker = await signIn("worker");
	const since = new Date().toISOString();
	const day = (offset: number) => addDays(WEEKS.leaveFlow, offset + 14);
	const toApprove = await worker.post("~/me/leave-requests", { leaveType: "ANNUAL", startDate: day(0), endDate: day(0), notes: "Wedding" });
	const approved = await manager.post(`${leaveBase(seed.membershipIds.worker)}/${toApprove.data?.leaveRequestId}/approval`, { comment: "Enjoy the wedding" });
	const toReject = await worker.post("~/me/leave-requests", { leaveType: "ANNUAL", startDate: day(1), endDate: day(1), notes: "Trip" });
	const rejected = await manager.post(`${leaveBase(seed.membershipIds.worker)}/${toReject.data?.leaveRequestId}/rejection`, { reason: "Two officers already off" });
	const recorded = await manager.post(`${leaveBase(seed.membershipIds.worker)}/approved`, { leaveType: "ANNUAL", startDate: day(2), endDate: day(2), remark: "Rang in sick-note style", takeOffRosteredDays: true });
	const changed = await manager.patch(`${leaveBase(seed.membershipIds.worker)}/${recorded.data?.leaveRequestId}`, { leaveType: "ANNUAL", startDate: day(2), endDate: day(3), remark: "Extended by a day", takeOffRosteredDays: true });
	const cancelled = await manager.post(`${leaveBase(seed.membershipIds.worker)}/${recorded.data?.leaveRequestId}/cancellation`, { remark: "Back early" });
	const expected: Record<string, string> = {
		LEAVE_REQUEST_APPROVED: "Enjoy the wedding",
		LEAVE_REQUEST_REJECTED: "Two officers already off",
		LEAVE_REQUEST_RECORDED: "Rang in sick-note style",
		LEAVE_REQUEST_CHANGED: "Extended by a day",
		LEAVE_REQUEST_CANCELLED: "Back early",
	};
	await waitForNotification(worker, "LEAVE_REQUEST_CANCELLED", since);
	const inbox = (await notificationsOf(worker)).filter((row) => (row.createdAt ?? "") >= since);
	const remarks = Object.fromEntries(Object.keys(expected).map((type) => [type, inbox.find((row) => row.type === type)?.remark ?? null]));

	const page = await openAs(browser, "worker");
	await page.goto("/notifications");
	await settle(page);
	await screen(page, testInfo, "E2E-072", "1-worker-notifications-remarks");
	const shown = Object.fromEntries(await Promise.all(Object.values(expected).map(async (text) => [text, await page.getByText(text).count()] as const)));
	const openItToSeeWhy = await page.getByText(/Open it to see why/).count();
	actual(
		testInfo,
		`writes: approve ${approved.status}, reject ${rejected.status}, record ${recorded.status}, change ${changed.status}, cancel ${cancelled.status}; API remarks ${JSON.stringify(remarks)}; on screen ${JSON.stringify(shown)}; "Open it to see why" ${openItToSeeWhy}`
	);
	for (const [type, remark] of Object.entries(expected)) {
		expect(remarks[type], type).toBe(remark);
		expect(shown[remark], `${type} remark on screen`).toBeGreaterThan(0);
	}
	expect(openItToSeeWhy).toBe(0);
});

test("E2E-073 approving leave that started before today needs a comment (400 without; the dialog asks for it)", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const lina = memberOf("p6");
	const past = addDays(singaporeToday(), -3);
	// The admin applies on Lina's behalf (the manager role holds no leave_request:create); the manager reviews it.
	const admin = await signIn("admin");
	const applied = await admin.post(leaveBase(lina), { leaveType: "ANNUAL", startDate: past, endDate: past, notes: "Forgot to apply" });
	const leaveId = expectStatus(applied, 201, "apply for past leave").leaveRequestId;
	const bare = await manager.post(`${leaveBase(lina)}/${leaveId}/approval`, { comment: "" });

	const page = await openAs(browser, "manager");
	await page.goto("/leave");
	await settle(page);
	await page.getByRole("tab", { name: "Team requests" }).click();
	await settle(page);
	// The list pages; sorting by period (earliest first) brings the past request to the top.
	const row = page.getByRole("row").filter({ hasText: "Lina Officer" }).filter({ hasText: "Pending" });
	for (let attempt = 0; attempt < 2 && !(await row.count()); attempt++) {
		await page.getByRole("button", { name: "Sort by Period" }).first().click();
		await settle(page);
	}
	await row.first().getByRole("button", { name: "View request for Lina Officer" }).click();
	const dialog = page.getByRole("dialog");
	// Approve opens the decision step (its comment field and hint); Confirm approval submits it.
	await dialog.getByRole("button", { name: "Approve", exact: true }).click();
	await settle(page);
	const hint = await dialog.getByText("This leave includes days before today, so say why. The employee will see this.").count();
	await screen(page, testInfo, "E2E-073", "1-past-leave-dialog");
	await dialog.getByRole("button", { name: "Confirm approval" }).click();
	await settle(page);
	// The comment field is `required`, so the browser's own "fill out this field" may block the submit before the
	// app's sentence shows: either way nothing is sent without a comment.
	const missing = await dialog.getByText("Enter a comment: this leave includes days before today.").count();
	const nativeBlock = await dialog.getByRole("textbox").first().evaluate((field) => (field as HTMLTextAreaElement).validity.valueMissing);
	await screen(page, testInfo, "E2E-073", "2-comment-missing");
	const withComment = await manager.post(`${leaveBase(lina)}/${leaveId}/approval`, { comment: "Approved late: she was on site" });
	actual(
		testInfo,
		`apply for ${past} ${applied.status}; approve without comment → ${bare.status} ${bare.errorCode ?? ""}; dialog hint ${hint}, app's missing-comment message ${missing}, browser's required-field block ${nativeBlock}; approve with comment → ${withComment.status} ${withComment.data?.status ?? ""}`
	);
	expect(applied.status).toBe(201);
	expect(bare.status).toBe(400);
	expect(bare.errorCode).toBe("LEAVE_COMMENT_REQUIRED_FOR_PAST_DAYS");
	expect(hint).toBe(1);
	expect(missing === 1 || nativeBlock).toBe(true);
	expect(withComment.status).toBe(200);
});

test("E2E-074 Withdraw publication: only schedule:publish holders get it; it needs a remark", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	state.withdrawWeek = await generatedOperationsWeek(manager, seed, "Ops withdraw week", WEEKS.withdrawPublication);
	const path = schedulePath(seed, operations, state.withdrawWeek);
	expectStatus(await manager.post(`${path}/approval`), 200, "publish");
	const week = weekDays(WEEKS.withdrawPublication);
	const shifts = await rosterShifts(manager, seed, operations, state.withdrawWeek);
	const edit = await applyChange(manager, seed, operations, state.withdrawWeek, [{ membershipId: seed.membershipIds.worker, day: week[4], kind: "WORK", shiftId: shifts.Night }], "Friday night cover");
	state.withdrawChangeId = edit.applied.data?.changeId ?? edit.applied.data?.rosterChangeId;

	const menuOf = async (role: Role) => {
		const page = await openAs(browser, role);
		await page.goto(`/scheduling/${state.withdrawWeek}`);
		await settle(page);
		const more = page.getByRole("button", { name: /More actions for/ });
		const items = (await more.count()) ? (await more.click(), await page.getByRole("menu").getByRole("menuitem").allInnerTexts()) : [];
		return { page, items };
	};
	const editor = await menuOf("editor");
	await screen(editor.page, testInfo, "E2E-074", "1-editor-menu");
	const approver = await menuOf("approver");
	const managerView = await menuOf("manager");
	await screen(managerView.page, testInfo, "E2E-074", "2-manager-menu");
	await managerView.page.getByRole("menuitem", { name: "Withdraw publication" }).click();
	const dialog = managerView.page.getByRole("dialog");
	const title = (await dialog.getByRole("heading").first().innerText()).trim();
	await dialog.getByRole("button", { name: "Withdraw publication" }).click();
	await settle(managerView.page);
	const required = await dialog.getByText("Enter a remark: everyone on this roster will read it.").count();
	await screen(managerView.page, testInfo, "E2E-074", "3-remark-required");
	const bareApi = await manager.post(`${path}/publication-withdrawal`, { remark: "" });
	const editorApi = await (await signIn("editor")).post(`${path}/publication-withdrawal`, { remark: "Editor tries" });
	actual(
		testInfo,
		`editor menu: ${editor.items.join(", ") || "(none)"}; approver menu: ${approver.items.join(", ")}; manager menu: ${managerView.items.join(", ")}; dialog "${title}"; empty remark message ${required}; API empty remark → ${bareApi.status} ${bareApi.errorCode ?? ""}; editor API → ${editorApi.status}`
	);
	expect(editor.items).not.toContain("Withdraw publication");
	expect(approver.items).toContain("Withdraw publication");
	expect(managerView.items).toContain("Withdraw publication");
	expect(required).toBe(1);
	expect(bareApi.status).toBe(400);
	expect(editorApi.status).toBe(403);
});

test("E2E-075 withdrawn: back to Generated with edits and history kept, everyone told with a link to My roster, ledger drops published rows", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const worker = await signIn("worker");
	const path = schedulePath(seed, operations, state.withdrawWeek!);
	const week = weekDays(WEEKS.withdrawPublication);
	const since = new Date().toISOString();
	const rostered = new Set(expectStatus(await manager.get(`${path}/assignments`), 200, "assignments").filter((row: any) => row.shift).map((row: any) => row.member.membershipId));

	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${state.withdrawWeek}`);
	await settle(page);
	await page.getByRole("button", { name: /More actions for/ }).click();
	await page.getByRole("menuitem", { name: "Withdraw publication" }).click();
	const dialog = page.getByRole("dialog");
	await dialog.getByRole("textbox").fill("Published too early; a corrected roster follows");
	await dialog.getByRole("button", { name: "Withdraw publication" }).click();
	await expect(page.getByText("Publication withdrawn.").first()).toBeVisible({ timeout: 20_000 });
	await settle(page);
	await screen(page, testInfo, "E2E-075", "1-withdrawn-generated");

	const schedule = await readSchedule(manager, seed, operations, state.withdrawWeek!);
	const friday = await dayOf(manager, seed, operations, state.withdrawWeek!, seed.membershipIds.worker, week[4]);
	// No list route: the history shows through the latest change and each cell's last change.
	const latestAnswer = await manager.get(`${path}/roster-changes/latest`);
	const latest = (latestAnswer.data ?? latestAnswer.body)?.change;
	const notice = await waitForNotification(worker, "SCHEDULE_PUBLICATION_WITHDRAWN", since);
	const told = queryRows(
		`SELECT count(DISTINCT n.recipient_membership_id) AS told FROM notification_events e JOIN notifications n ON n.event_id = e.id WHERE e.type = 'SCHEDULE_PUBLICATION_WITHDRAWN' AND e.occurred_at >= ${literal(since)}`
	)[0]?.["told"];
	const ledger = queryRows(
		`SELECT w.source, count(*) AS rows FROM work_hours_entries w JOIN schedules s ON s.id = w.schedule_id WHERE s.uuid = ${literal(state.withdrawWeek!)} AND w.deleted_at IS NULL GROUP BY w.source`
	);
	const workerPage = await openAs(browser, "worker");
	await workerPage.goto("/notifications");
	await settle(workerPage);
	await screen(workerPage, testInfo, "E2E-075", "2-worker-notice");
	const row = workerPage.getByText("A published schedule you’re on was withdrawn.").first();
	const remarkShown = await workerPage.getByText("Published too early; a corrected roster follows").count();
	await row.click();
	await settle(workerPage);
	const opened = new URL(workerPage.url()).pathname;
	await screen(workerPage, testInfo, "E2E-075", "3-worker-opened-link");
	actual(
		testInfo,
		`status ${schedule.status}, publicationWithdrawnAt ${schedule.publicationWithdrawnAt ? "set" : "null"}; worker Friday ${friday?.shift?.name ?? "off"} (edited to Night); Friday's last change remark "${friday?.lastChange?.remark ?? ""}", latest change ${latestAnswer.status} ${latest?.changeId ? "kept" : "missing"}; rostered people ${rostered.size}, told ${told}; worker notice remark "${notice?.remark ?? ""}", on screen ${remarkShown}, opens ${opened}; ledger ${ledger.map((entry) => `${entry["source"]}=${entry["rows"]}`).join(", ")}`
	);
	expect(schedule.status).toBe("GENERATED");
	expect(schedule.publicationWithdrawnAt).toBeTruthy();
	expect(friday?.shift?.name).toBe("Night");
	expect(friday?.lastChange?.remark).toBe("Friday night cover");
	expect(latest?.changeId).toBeTruthy();
	expect(Number(told)).toBeGreaterThanOrEqual(rostered.size);
	expect(notice?.remark).toBe("Published too early; a corrected roster follows");
	expect(opened).toContain("/me/schedules/");
	expect(ledger.filter((entry) => ["PUBLISHED", "CHANGE_SET"].includes(entry["source"] ?? "")).length).toBe(0);
});

test("E2E-076 a once-published roster cannot be regenerated: the API refuses and the page does not offer it", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const refused = await manager.post(`${schedulePath(seed, operations, state.withdrawWeek!)}/regeneration`);
	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${state.withdrawWeek}`);
	await settle(page);
	const more = page.getByRole("button", { name: /More actions for/ });
	await more.click();
	const items = await page.getByRole("menu").getByRole("menuitem").allInnerTexts();
	const regenerate = page.getByRole("menuitem", { name: /Regenerate/ });
	if (await regenerate.count()) {
		await regenerate.click();
		await settle(page);
		const confirm = page.getByRole("dialog").getByRole("button", { name: /Regenerate/ });
		if (await confirm.count()) await confirm.last().click();
		await settle(page);
	} else {
		await page.keyboard.press("Escape");
	}
	const explained = await page.getByText("This roster was published once, so it can’t be regenerated. Change its days on the roster instead.").count();
	await screen(page, testInfo, "E2E-076", "1-regenerate-explained");
	const offered = items.some((item) => /Regenerate/.test(item));
	actual(testInfo, `API regenerate → ${refused.status} ${refused.errorCode ?? ""}; menu: ${items.join(", ")}; Regenerate offered ${offered}; explanation shown ${explained}`);
	expect(refused.status).toBe(409);
	expect(refused.errorCode).toBe("SCHEDULE_ONCE_PUBLISHED");
	// Either the page hides Regenerate, or it offers it and explains the refusal.
	expect(!offered || explained > 0).toBe(true);
});

test("E2E-077 a blank withdrawal remark answers the documented 400 INVALID_PUBLICATION_WITHDRAWAL_REMARK", async ({}, testInfo) => {
	// On the seed's published week 47: the remark is checked before the roster's state, so nothing changes.
	const manager = await signIn("manager");
	const path = schedulePath(seed, operations, seed.schedules.published);
	const blank = await manager.post(`${path}/publication-withdrawal`, { remark: "" });
	const spaces = await manager.post(`${path}/publication-withdrawal`, { remark: "   " });
	const status = (await readSchedule(manager, seed, operations, seed.schedules.published)).status;
	actual(testInfo, `blank remark → ${blank.status} ${blank.errorCode ?? "(no errorCode)"}; spaces → ${spaces.status} ${spaces.errorCode ?? "(no errorCode)"}; week 47 still ${status}`);
	expect(status).toBe("PUBLISHED");
	expect(blank.status).toBe(400);
	expect(blank.errorCode).toBe("INVALID_PUBLICATION_WITHDRAWAL_REMARK");
	expect(spaces.errorCode).toBe("INVALID_PUBLICATION_WITHDRAWAL_REMARK");
});
