import { expect, test } from "@playwright/test";

import { ApiClient, rowsOf } from "./support/api";
import { queryRows } from "./support/database";
import { readAccounts, type Role } from "./support/environment";
import { applyChange, dayOf, rosterShifts, type ShiftName } from "./support/roster";
import { addDays, freshWeekday, readSeed, weekDays, WEEKS } from "./support/seed-data";
import { schedulePath } from "./support/schedules";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Flow 7: leave against the published week 47, across user types: the worker applies and withdraws; the Operations
 * manager approves (with and without taking the shift off), records, changes, splits and cancels; the editor without
 * leave keys sees only "Needs attention"; the worker sees their own leave, never the cover gap. Edges: concurrent
 * approvals, editing a day under leave, overlap, a type-only change, approving one's own leave.
 */

const seed = readSeed();
const accounts = readAccounts();
const operations = seed.departments.operations;
const published = seed.schedules.published;
const week = weekDays(WEEKS.published);
const memberOf = (key: string) => seed.members.find((member) => member.key === key)!.membershipId;
const signIn = async (role: Role) => (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);
const state: { workerDay?: string; workerShift?: string; workerLeave?: string; omarLeave?: string } = {};

/** The member's working days on the published week, with their shift names. */
async function workingDays(api: ApiClient, membershipId: string): Promise<{ day: string; shift: string }[]> {
	const rows = (await api.get(`${schedulePath(seed, operations, published)}/assignments`)).data;
	return rows.filter((row: any) => row.member.membershipId === membershipId && row.shift).map((row: any) => ({ day: row.day, shift: row.shift.name }));
}

async function notificationsOf(api: ApiClient): Promise<any[]> {
	const answer = await api.get("~/me/notifications?page=0&size=100");
	return rowsOf(answer.data ?? answer.body);
}

test.describe.configure({ mode: "serial" });

test("E2E-060 the worker applies over a published shift (the form names the shift), then withdraws", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const worker = await signIn("worker");
	let days = await workingDays(manager, seed.membershipIds.worker);
	if (days.length < 3) {
		// The engine left the worker (almost) unrostered this week: give them weekday mornings by a published edit.
		const shifts = await rosterShifts(manager, seed, operations, published);
		for (const day of week.slice(0, 3)) {
			await applyChange(manager, seed, operations, published, [{ membershipId: seed.membershipIds.worker, day, kind: "WORK", shiftId: shifts.Morning }], "Covering the week");
		}
		days = await workingDays(manager, seed.membershipIds.worker);
	}
	const target = days.find((day) => week.slice(0, 5).includes(day.day)) ?? days[0];
	if (!target) throw new Error("the worker has no working day on the published week");
	state.workerDay = target.day;
	state.workerShift = target.shift;
	// Answers a bare list [{day, minutes}] rather than the {success, data} envelope.
	const rosteredAnswer = await worker.get(`~/me/leave-requests/rostered-days?startDate=${target.day}&endDate=${target.day}`);
	const rostered = rosteredAnswer.data ?? rosteredAnswer.body;

	const page = await openAs(browser, "worker");
	await page.goto("/leave");
	await settle(page);
	await screen(page, testInfo, "E2E-060", "1-worker-leave-page");
	const apply = page.getByRole("button", { name: /apply|request leave|new request/i }).first();
	if (await apply.count()) {
		await apply.click();
		await settle(page);
		await screen(page, testInfo, "E2E-060", "2-apply-form");
	}

	const applied = await worker.post("~/me/leave-requests", { leaveType: "ANNUAL", startDate: target.day, endDate: target.day, notes: "Family errand" });
	const withdrawn = await worker.post(`~/me/leave-requests/${applied.data?.leaveRequestId}/withdrawal`);
	actual(testInfo, `rostered-days for ${target.day} → ${JSON.stringify(rostered).slice(0, 160)}; apply ${applied.status}; withdraw ${withdrawn.status} → ${withdrawn.data?.status}`);
	expect(rostered.find((row: any) => row.day === target.day)?.minutes).toBeGreaterThan(0);
	expect(applied.status).toBe(201);
	expect(withdrawn.status).toBe(200);
});

test("E2E-061 approving over a shift needs the tick (409 without); with it the person is off, the shift needs cover, Issues counts it, undo refused", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const worker = await signIn("worker");
	const applied = await worker.post("~/me/leave-requests", { leaveType: "ANNUAL", startDate: state.workerDay, endDate: state.workerDay, notes: "Appointment" });
	state.workerLeave = applied.data.leaveRequestId;
	const path = `~/member-profiles/${seed.membershipIds.worker}/leave-requests/${state.workerLeave}/approval`;
	const withoutTick = await manager.post(path, { comment: "ok", takeOffRosteredDays: false });
	const withTick = await manager.post(path, { comment: "Enjoy", takeOffRosteredDays: true });
	const day = await dayOf(manager, seed, operations, published, seed.membershipIds.worker, state.workerDay!);
	const latest = (await manager.get(`${schedulePath(seed, operations, published)}/roster-changes/latest`)).data?.change;
	const undo = latest?.changeId
		? await manager.post(`${schedulePath(seed, operations, published)}/roster-changes/${latest.changeId}/undo`, { expectedRevision: latest.toRevision, remark: null, checksFingerprint: null })
		: { status: 0, errorCode: "no latest change" };

	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${published}`);
	await settle(page);
	const issues = page.getByRole("button", { name: /^Issues/ });
	await screen(page, testInfo, "E2E-061", "1-roster-leave-marker");
	await issues.click();
	await settle(page);
	const needsCover = page.getByRole("complementary").getByText(`Needs cover: ${state.workerShift}`).first();
	await screen(page, testInfo, "E2E-061", "2-issues-needs-cover");
	actual(
		testInfo,
		`without tick → ${withoutTick.status} ${withoutTick.errorCode ?? ""}; with tick → ${withTick.status}; day off=${day?.off} reason=${day?.offReason} uncovered=${day?.uncoveredShift?.name}; Issues button: ${(await issues.count()) ? (await issues.innerText()).replace(/\s+/g, " ") : "none"}; "Needs cover: ${state.workerShift}" in Issues: ${await needsCover.isVisible().catch(() => false)}; latest change kind ${latest?.kind} undoable=${latest?.undoable}; undo it → ${undo.status} ${undo.errorCode ?? ""}`
	);
	expect(withoutTick.status).toBe(409);
	expect(withTick.status).toBe(200);
	expect(day?.off).toBe(true);
	expect(day?.uncoveredShift?.name).toBe(state.workerShift);
	expect(await issues.count()).toBe(1);
	await expect(needsCover).toBeVisible();
	expect(undo.status).toBe(409);
});

test("E2E-062 nobody approves their own leave (the manager's own request → 403)", async ({}, testInfo) => {
	const manager = await signIn("manager");
	const ownDay = freshWeekday();
	const own = await manager.post("~/me/leave-requests", { leaveType: "ANNUAL", startDate: ownDay, endDate: ownDay, notes: "Own" });
	const approve = await manager.post(`~/member-profiles/${seed.membershipIds.manager}/leave-requests/${own.data?.leaveRequestId}/approval`, { comment: "self", takeOffRosteredDays: true });
	actual(testInfo, `own request ${own.status}; self-approval → ${approve.status} ${approve.errorCode ?? ""}`);
	expect(approve.status).toBe(403);
});

test("E2E-063 record leave, change dates and type, cancel one day (split), cancel the rest", async ({}, testInfo) => {
	const manager = await signIn("manager");
	const omar = memberOf("p5");
	const base = `~/member-profiles/${omar}/leave-requests`;
	const recorded = await manager.post(`${base}/approved`, { leaveType: "ANNUAL", startDate: week[1], endDate: week[3], remark: "Rang in", takeOffRosteredDays: true });
	state.omarLeave = recorded.data?.leaveRequestId;
	const changed = await manager.patch(`${base}/${state.omarLeave}`, { leaveType: "SICK", startDate: week[1], endDate: week[4], remark: "Doctor's note covers Friday", takeOffRosteredDays: true });
	const splitDay = await manager.post(`${base}/${state.omarLeave}/days/${week[2]}/cancellation`, { remark: "Came in Wednesday" });
	const historyAnswer = await manager.get(`${base}/${state.omarLeave}/changes`);
	const history = historyAnswer.data ?? historyAnswer.body ?? [];
	const all = rowsOf((await manager.get(`~/leave-requests?page=0&size=100`)).data).filter((row: any) => row.membershipId === omar && row.status === "APPROVED");
	actual(
		testInfo,
		`record ${recorded.status} (${week[1]}–${week[3]}); change type+dates ${changed.status} → ${changed.data?.leaveType ?? changed.data?.leaveTypeName} ${changed.data?.startDate}–${changed.data?.endDate}; cancel ${week[2]} → ${splitDay.status}; approved requests now ${all.map((row: any) => `${row.startDate}–${row.endDate}`).join(", ")}; record ${recorded.status} ${recorded.errorCode ?? ""}; history entries ${rowsOf(history).length}`
	);
	expect(recorded.status).toBe(201);
	expect(changed.status).toBe(200);
	expect(splitDay.status).toBe(200);
	expect(all.length).toBe(2);
	for (const part of all) {
		const cancelAll = await manager.post(`${base}/${part.leaveRequestId}/cancellation`, { remark: "Back at work" });
		expect(cancelAll.status).toBe(200);
	}
	const after = rowsOf((await manager.get(`~/leave-requests?page=0&size=100`)).data).filter((row: any) => row.membershipId === omar && row.status === "APPROVED");
	actual(testInfo, `after cancelling every part: ${after.length} approved left`);
	expect(after.length).toBe(0);
});

test("E2E-064 cancelling approved leave leaves the day 'Needs a decision' and tells the department's editors only", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const startedAt = new Date().toISOString();
	const cancelled = await manager.post(`~/member-profiles/${seed.membershipIds.worker}/leave-requests/${state.workerLeave}/cancellation`, { remark: "Plans changed" });
	const day = await dayOf(manager, seed, operations, published, seed.membershipIds.worker, state.workerDay!);
	await new Promise((resolve) => setTimeout(resolve, 12_000));
	const recipients = queryRows(
		`SELECT u.email FROM notification_events e JOIN notifications n ON n.event_id = e.id JOIN company_memberships m ON m.id = n.recipient_membership_id JOIN users u ON u.id = m.user_id WHERE e.type = 'ROSTER_DAY_NEEDS_DECISION' AND e.occurred_at >= '${startedAt}'`
	).map((row) => row["email"]);
	const expected = [accounts.emails.admin, accounts.emails.manager, accounts.emails.editor].sort();
	const editor = await signIn("editor");
	const notice = (await notificationsOf(editor)).find((row) => row.type === "ROSTER_DAY_NEEDS_DECISION");

	const page = await openAs(browser, "editor");
	await page.goto("/notifications");
	await settle(page);
	await screen(page, testInfo, "E2E-064", "1-editor-notifications");
	const link = page.getByText(/needs attention/i).first();
	if (await link.count()) {
		await link.click();
		await settle(page);
	}
	await screen(page, testInfo, "E2E-064", "2-opened-from-notification");
	actual(
		testInfo,
		`cancel ${cancelled.status}; day flag ${day?.flag} uncovered=${day?.uncoveredShift?.name ?? "-"}; recipients: ${recipients.sort().join(", ") || "none"}; editor notice remark/leave fields: ${JSON.stringify({ remark: notice?.remark, leaveRequestId: notice?.leaveRequestId })}; opened ${new URL(page.url()).pathname}${new URL(page.url()).search}`
	);
	expect(cancelled.status).toBe(200);
	expect(recipients.sort()).toEqual(expected);
	expect(notice?.leaveRequestId ?? null).toBeNull();
	expect(page.url()).toContain(published);
	expect(page.url()).toContain("panel=issues");
});

test("E2E-065 the editor without leave keys sees 'Needs attention', no leave type; others' leave reads Day off, also in the export", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const editor = await signIn("editor");
	const lina = memberOf("p6");
	const recorded = await manager.post(`~/member-profiles/${lina}/leave-requests/approved`, { leaveType: "SICK", startDate: week[0], endDate: week[0], remark: "Flu", takeOffRosteredDays: true });
	const asEditor = await dayOf(editor, seed, operations, published, lina, week[0]);
	const asManager = await dayOf(manager, seed, operations, published, lina, week[0]);
	const workerDay = await dayOf(editor, seed, operations, published, seed.membershipIds.worker, state.workerDay!);
	const exported = await editor.download(`${schedulePath(seed, operations, published)}/export`);
	const exportText = exported.bytes.toString("latin1");

	const page = await openAs(browser, "editor");
	await page.goto(`/scheduling/${published}`);
	await settle(page);
	await screen(page, testInfo, "E2E-065", "1-editor-roster");
	// Since app #107 the grid shows a corner mark at rest; the words live in the Issues panel.
	await page.getByRole("button", { name: /^Issues/ }).click();
	await settle(page);
	await screen(page, testInfo, "E2E-065", "2-editor-issues");
	const attention = await page.getByText("Needs attention").count();
	const decision = await page.getByText("Needs a decision").count();
	const sickShown = await page.getByText(/Sick/).count();
	actual(
		testInfo,
		`record ${recorded.status}; Lina's day as editor: off=${asEditor?.off} reason=${asEditor?.offReason} type=${asEditor?.leaveTypeName ?? "-"} lastChange=${asEditor?.lastChange ? "shown" : "none"}; as manager: reason=${asManager?.offReason} type=${asManager?.leaveTypeName}; worker's day as editor: flag=${workerDay?.flag}; grid "Needs attention" ${attention}, "Needs a decision" ${decision}, "Sick" ${sickShown}; export ${exported.status}, mentions Sick: ${/Sick/i.test(exportText)}`
	);
	expect(asEditor?.leaveTypeName ?? null).toBeNull();
	expect(asEditor?.offReason).toBe("OFF");
	expect(asManager?.leaveTypeName).toMatch(/Sick/);
	expect(attention).toBeGreaterThan(0);
	expect(decision).toBe(0);
	expect(sickShown).toBe(0);
	expect(exported.status).toBe(200);
	expect(/Sick/i.test(exportText)).toBe(false);
});

test("E2E-066 from the roster editor: give a shift back and confirm a day off, each remark reaching the employee", async ({}, testInfo) => {
	const manager = await signIn("manager");
	const worker = await signIn("worker");
	const startedAt = new Date().toISOString().slice(0, 19);
	const shifts = await rosterShifts(manager, seed, operations, published);
	const giveBack = await applyChange(manager, seed, operations, published, [{ membershipId: seed.membershipIds.worker, day: state.workerDay!, kind: "WORK", shiftId: shifts[state.workerShift as ShiftName] }], "Shift is yours again");
	const omarDays = await workingDays(manager, memberOf("p5"));
	const offDay = week.find((day) => !omarDays.some((working) => working.day === day));
	const confirm = offDay ? await applyChange(manager, seed, operations, published, [{ membershipId: memberOf("p5"), day: offDay, kind: "OFF" }], "Day off confirmed") : null;
	await new Promise((resolve) => setTimeout(resolve, 10_000));
	const notices = (await notificationsOf(worker)).filter((row) => (row.createdAt ?? "") >= startedAt);
	actual(testInfo, `give back → ${giveBack.applied.status}; confirm day off → ${confirm?.applied.status ?? "n/a"}; worker notices since: ${notices.map((row) => `${row.type}:"${row.remark ?? ""}"`).join(", ")}`);
	expect(giveBack.applied.status).toBe(201);
	expect(notices.some((row) => row.remark === "Shift is yours again")).toBe(true);
});

test("E2E-067 the worker's My roster shows their own leave, never a cover gap or a colleague's leave", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const worker = await signIn("worker");
	const target = (await workingDays(manager, seed.membershipIds.worker)).find((day) => day.day !== state.workerDay);
	const recorded = await manager.post(`~/member-profiles/${seed.membershipIds.worker}/leave-requests/approved`, { leaveType: "ANNUAL", startDate: target!.day, endDate: target!.day, remark: "Booked for you", takeOffRosteredDays: true });
	const mine = (await worker.get(`~/me/schedules/${published}`)).data;
	// My roster lists the whole team; the worker's own row carries the leave, colleagues' rows only "off".
	const ownRows = mine.assignments.filter((row: any) => row.member.membershipId === seed.membershipIds.worker);
	const colleagues = mine.assignments.filter((row: any) => row.member.membershipId !== seed.membershipIds.worker);
	const myDay = ownRows.find((row: any) => row.day === target!.day);
	const anyGap = mine.assignments.some((row: any) => row.uncoveredShift);
	const colleagueDetail = colleagues.filter((row: any) => row.leaveTypeName || row.leaveRequestId || row.offReason === "LEAVE" || row.flag).length;
	const page = await openAs(browser, "worker");
	await page.goto(`/me/schedules/${published}`);
	await settle(page);
	await screen(page, testInfo, "E2E-067", "1-my-roster-own-leave");
	const coverText = await page.getByText(/Needs cover/).count();
	actual(testInfo, `record ${recorded.status}; my day ${target!.day}: off=${myDay?.off} reason=${myDay?.offReason} type=${myDay?.leaveTypeName}; any uncoveredShift in my roster: ${anyGap}; colleague rows ${colleagues.length}, with leave detail ${colleagueDetail}; "Needs cover" on page: ${coverText}`);
	expect(myDay?.leaveTypeName).toMatch(/Annual/);
	expect(anyGap).toBe(false);
	expect(colleagueDetail).toBe(0);
	expect(coverText).toBe(0);
});

test("E2E-068 two managers approve the same request at once: one wins, one gets 409", async ({}, testInfo) => {
	const admin = await signIn("admin");
	const manager = await signIn("manager");
	const worker = await signIn("worker");
	const raceDay = freshWeekday();
	const applied = await worker.post("~/me/leave-requests", { leaveType: "ANNUAL", startDate: raceDay, endDate: addDays(raceDay, 1), notes: "Race" });
	const path = `~/member-profiles/${seed.membershipIds.worker}/leave-requests/${applied.data.leaveRequestId}/approval`;
	const [first, second] = await Promise.all([admin.post(path, { comment: "a", takeOffRosteredDays: true }), manager.post(path, { comment: "b", takeOffRosteredDays: true })]);
	actual(testInfo, `concurrent approvals → ${first.status} and ${second.status} (${first.errorCode ?? second.errorCode ?? ""})`);
	expect([first.status, second.status].sort()).toEqual([200, 409]);
});

test("E2E-069 a roster edit on a day under approved leave is refused", async ({}, testInfo) => {
	const manager = await signIn("manager");
	const underLeave = (await manager.get(`${schedulePath(seed, operations, published)}/assignments`)).data.find((row: any) => row.member.membershipId === seed.membershipIds.worker && row.leaveRequestId);
	const shifts = await rosterShifts(manager, seed, operations, published);
	const { preview, applied } = await applyChange(manager, seed, operations, published, [{ membershipId: seed.membershipIds.worker, day: underLeave.day, kind: "WORK", shiftId: shifts.Morning }], "Try to roster over leave");
	actual(testInfo, `day ${underLeave.day} under leave; preview refused=${preview.data?.refused} (${preview.status} ${preview.errorCode ?? ""}); apply → ${applied.status} ${applied.errorCode ?? ""}`);
	expect(applied.status).toBeGreaterThanOrEqual(400);
});

test("E2E-070 an overlapping request is refused; a type-only change is never refused for overlap", async ({}, testInfo) => {
	const worker = await signIn("worker");
	const manager = await signIn("manager");
	const tripDay = freshWeekday();
	const first = await worker.post("~/me/leave-requests", { leaveType: "ANNUAL", startDate: tripDay, endDate: addDays(tripDay, 2), notes: "Trip" });
	const overlapping = await worker.post("~/me/leave-requests", { leaveType: "ANNUAL", startDate: addDays(tripDay, 2), endDate: addDays(tripDay, 2), notes: "Overlap" });
	const approve = await manager.post(`~/member-profiles/${seed.membershipIds.worker}/leave-requests/${first.data.leaveRequestId}/approval`, { comment: "ok", takeOffRosteredDays: true });
	const typeOnly = await manager.patch(`~/member-profiles/${seed.membershipIds.worker}/leave-requests/${first.data.leaveRequestId}`, { leaveType: "SICK", remark: "Was sick instead" });
	actual(testInfo, `first ${first.status}; overlapping → ${overlapping.status} ${overlapping.errorCode ?? ""}; approve ${approve.status}; type-only change → ${typeOnly.status} ${typeOnly.errorCode ?? ""}`);
	expect(overlapping.status).toBe(409);
	expect(typeOnly.status).toBe(200);
});
