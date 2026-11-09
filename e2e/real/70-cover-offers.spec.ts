import { expect, test } from "@playwright/test";

import { ApiClient, rowsOf } from "./support/api";
import { readAccounts, type Role } from "./support/environment";
import { applyChange, dayOf, readSchedule, rosterShifts } from "./support/roster";
import { readSeed, weekDays, WEEKS } from "./support/seed-data";
import { schedulePath } from "./support/schedules";
import { actual } from "./support/ui";

/**
 * Cover offers API (ADR-0066) on the published week 47, Operations: send → accept applies the change set and notifies
 * the manager; decline; a recorded yes applies at once; stale 409; a draft roster 422; one's own offer 403.
 */

const seed = readSeed();
const accounts = readAccounts();
const operations = seed.departments.operations;
const published = seed.schedules.published;
const offersPath = `${schedulePath(seed, operations, published)}/cover-offers`;
const week = weekDays(WEEKS.published);
const signIn = async (role: Role) => (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);

/** A day the member is off on the published week (so an offer to work it is an OFF_DAY_SHIFT), skipping `exclude`. */
async function offDay(api: ApiClient, membershipId: string, exclude: string[] = []): Promise<string> {
	for (const day of week) {
		if (exclude.includes(day)) continue;
		const row = await dayOf(api, seed, operations, published, membershipId, day);
		if (row?.off && !row.leaveRequestId) return day;
	}
	throw new Error("no free day off for the offer");
}

async function sendOffer(api: ApiClient, membershipId: string, day: string, shiftId: string, path = offersPath, scheduleId = published) {
	const revision = (await readSchedule(api, seed, operations, scheduleId)).rosterRevision;
	return api.post(path, {
		optionKind: "OFF_DAY_SHIFT",
		rosterDate: day,
		expectedRevision: revision,
		cells: [{ membershipId, day, kind: "WORK", shiftId }],
		remark: "Can you take this one?",
		checksFingerprint: null,
		send: true,
		parallelTo: null,
	});
}

async function notifications(api: ApiClient): Promise<any[]> {
	const answer = await api.get("~/me/notifications?page=0&size=100");
	return rowsOf(answer.data ?? answer.body);
}

test.describe.configure({ mode: "serial" });

test("E2E-080 send → the member accepts: the change set applies and the manager is told", async ({}, testInfo) => {
	const manager = await signIn("manager");
	const approver = await signIn("approver");
	const shifts = await rosterShifts(manager, seed, operations, published);
	const day = await offDay(manager, seed.membershipIds.approver);
	const sent = await sendOffer(manager, seed.membershipIds.approver, day, shifts.Evening);
	await new Promise((resolve) => setTimeout(resolve, 7_000));
	const askedNotice = (await notifications(approver)).find((row) => row.type === "COVER_OFFER_SENT");
	const mine = rowsOf((await approver.get("~/me/cover-offers?status=OPEN")).data);
	const accepted = await approver.post(`~/me/cover-offers/${sent.data?.offerId}/acceptance`, { reason: null });
	const after = await dayOf(manager, seed, operations, published, seed.membershipIds.approver, day);
	await new Promise((resolve) => setTimeout(resolve, 7_000));
	const answeredNotice = (await notifications(manager)).find((row) => row.type === "COVER_OFFER_ANSWERED");
	actual(
		testInfo,
		`send ${sent.status} ${sent.errorCode ?? ""}; member sees ${mine.length} open offer(s), notified: ${askedNotice ? "yes" : "no"}; accept ${accepted.status} → ${accepted.data?.status} appliedChange=${accepted.data?.appliedChangeId ? "yes" : "no"}; day ${day} now ${after?.shift?.name ?? "off"}; manager told: ${answeredNotice ? "yes" : "no"}`
	);
	expect(sent.status).toBe(201);
	expect(accepted.status).toBe(200);
	expect(after?.shift?.name).toBe("Evening");
	expect(askedNotice).toBeTruthy();
	expect(answeredNotice).toBeTruthy();
});

test("E2E-081 the member declines; a recorded yes applies at once and is kept as the consent record", async ({}, testInfo) => {
	const manager = await signIn("manager");
	const worker = await signIn("worker");
	const shifts = await rosterShifts(manager, seed, operations, published);
	const day = await offDay(manager, seed.membershipIds.worker);
	const sent = await sendOffer(manager, seed.membershipIds.worker, day, shifts.Night);
	const declined = await worker.post(`~/me/cover-offers/${sent.data?.offerId}/decline`, { reason: "Away that day" });
	const unchanged = await dayOf(manager, seed, operations, published, seed.membershipIds.worker, day);

	const revision = (await readSchedule(manager, seed, operations, published)).rosterRevision;
	const recorded = await manager.post(offersPath, {
		optionKind: "OFF_DAY_SHIFT",
		rosterDate: day,
		expectedRevision: revision,
		cells: [{ membershipId: seed.membershipIds.worker, day, kind: "WORK", shiftId: shifts.Morning }],
		remark: "Agreed on the phone",
		checksFingerprint: null,
		recorded: { how: "PHONE", when: new Date().toISOString() },
	});
	const after = await dayOf(manager, seed, operations, published, seed.membershipIds.worker, day);
	const list = rowsOf((await manager.get(`${offersPath}`)).data);
	actual(
		testInfo,
		`decline ${declined.status} → ${declined.data?.status}, day still ${unchanged?.shift?.name ?? "off"}; recorded ${recorded.status} → ${recorded.data?.status} via ${recorded.data?.recordedHow}; day now ${after?.shift?.name}; offers listed ${list.length}`
	);
	expect(declined.status).toBe(200);
	expect(declined.data?.status).toBe("DECLINED");
	expect(unchanged?.off).toBe(true);
	expect(recorded.status).toBe(201);
	expect(after?.shift?.name).toBe("Morning");
});

test("E2E-082 a yes after the day changed is stale (409); an offer on a draft roster is 422; one's own offer is 403", async ({}, testInfo) => {
	const manager = await signIn("manager");
	const approver = await signIn("approver");
	const shifts = await rosterShifts(manager, seed, operations, published);
	const usedDays: string[] = [];
	const day = await offDay(manager, seed.membershipIds.approver);
	usedDays.push(day);
	const sent = await sendOffer(manager, seed.membershipIds.approver, day, shifts.Morning);
	const edit = await applyChange(manager, seed, operations, published, [{ membershipId: seed.membershipIds.approver, day, kind: "WORK", shiftId: shifts.Night }], "Needed you on nights instead");
	const stale = await approver.post(`~/me/cover-offers/${sent.data?.offerId}/acceptance`, { reason: null });

	const draftSchedules = rowsOf((await manager.get(`~/schedules?departmentId=${operations}&status=GENERATED&page=0&size=20`)).data);
	const draft = draftSchedules[0];
	const draftOffer = draft
		? await sendOffer(manager, seed.membershipIds.approver, draft.periodStart, shifts.Morning, `${schedulePath(seed, operations, draft.scheduleId)}/cover-offers`, draft.scheduleId)
		: { status: 0, errorCode: "no generated draft found" };

	const ownDay = await offDay(manager, seed.membershipIds.manager, usedDays);
	const toSelf = await sendOffer(manager, seed.membershipIds.manager, ownDay, shifts.Morning);
	const selfAccept = toSelf.status === 201 ? await manager.post(`~/me/cover-offers/${toSelf.data.offerId}/acceptance`, { reason: null }) : toSelf;
	actual(
		testInfo,
		`send ${sent.status}; edit ${edit.applied.status}; stale accept → ${stale.status} ${stale.errorCode ?? ""}; draft offer → ${draftOffer.status} ${draftOffer.errorCode ?? ""}; offer to self → ${toSelf.status} ${toSelf.errorCode ?? ""}${toSelf.status === 201 ? `, accept own → ${selfAccept.status} ${selfAccept.errorCode ?? ""}` : ""}`
	);
	expect(stale.status).toBe(409);
	expect(stale.errorCode).toBe("COVER_OFFER_STALE");
	expect(draftOffer.status).toBe(422);
	expect([toSelf.status, selfAccept.status]).toContain(403);
});
