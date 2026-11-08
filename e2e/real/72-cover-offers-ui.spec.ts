import { expect, type Page, test } from "@playwright/test";

import { ApiClient, expectStatus, rowsOf } from "./support/api";
import { execute, literal } from "./support/database";
import { readAccounts, type Role } from "./support/environment";
import { notificationsOf, waitForNotification } from "./support/notifications";
import { applyChange, dayOf, previewChange, readSchedule, rosterShifts } from "./support/roster";
import { readSeed, weekDays, WEEKS } from "./support/seed-data";
import { generatedOperationsWeek, schedulePath } from "./support/schedules";
import { actual, openAs, screen, settle } from "./support/ui";

/**
 * Cover offers UI (app #110) on a published Operations week. Two gaps are made on purpose: Omar's Morning on Tuesday
 * and Lina's Morning on Wednesday, each emptied by leave approved after publication. The three people with accounts
 * (Wan, Ari, Eli) are off both days, so every offer to them is an OFF_DAY_SHIFT and they race for the same gap.
 *   Gap 1: Wan by the panel (UI), Ari and Eli by the API in parallel, a fourth refused; Ari declines with a reason
 *          on her card, Eli's runs out, Wan's is withdrawn from Issues.
 *   Gap 2: Wan and Ari race; Wan accepts on My roster and Ari's closes as taken.
 */

const seed = readSeed();
const accounts = readAccounts();
const operations = seed.departments.operations;
const week = weekDays(WEEKS.coverOffersUi);
const gapOneDay = week[1];
const gapTwoDay = week[2];
const signIn = async (role: Role) => (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);
const memberOf = (key: string) => seed.members.find((member) => member.key === key)!;
const people = { wan: memberOf("worker"), ari: memberOf("approver"), eli: memberOf("editor"), omar: memberOf("p5"), lina: memberOf("p6") };
const state: { scheduleId?: string; offers: Record<string, string>; issuesBefore?: string } = { offers: {} };
const offersPath = () => `${schedulePath(seed, operations, state.scheduleId!)}/cover-offers`;

/** Sends an OFF_DAY_SHIFT offer by the API at the roster's current revision, racing `parallelTo` when given. */
async function sendOffer(manager: ApiClient, membershipId: string, day: string, shiftId: string, parallelTo: string | null) {
	const cells = [{ membershipId, day, kind: "WORK" as const, shiftId }];
	const preview = await previewChange(manager, seed, operations, state.scheduleId!, cells);
	return manager.post(offersPath(), {
		optionKind: "OFF_DAY_SHIFT",
		rosterDate: day,
		expectedRevision: preview.data?.expectedRevision ?? (await readSchedule(manager, seed, operations, state.scheduleId!)).rosterRevision,
		cells,
		remark: "Can you cover the morning?",
		checksFingerprint: preview.data?.checksFingerprint ?? null,
		send: true,
		parallelTo,
	});
}

/** Opens the roster on the offers week and the cell of one member's day. */
async function openCell(page: Page, name: string, dayLabel: string): Promise<void> {
	await page.goto(`/scheduling/${state.scheduleId}`);
	await settle(page);
	await page.getByRole("button", { name: new RegExp(`^${name}, ${dayLabel}`) }).first().click();
	await settle(page);
}

async function issuesCount(page: Page): Promise<string> {
	const button = page.getByRole("button", { name: /^Issues: \d+/ });
	return (await button.count()) ? ((await button.getAttribute("aria-label")) ?? (await button.innerText())) : "Issues: 0";
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
	test.setTimeout(300_000);
	const manager = await signIn("manager");
	state.scheduleId = await generatedOperationsWeek(manager, seed, "Ops cover offers week", WEEKS.coverOffersUi);
	// Shape the draft: the three account holders off on both gap days, Omar and Lina on Morning there.
	const shifts = await rosterShifts(manager, seed, operations, state.scheduleId);
	const cells = [
		...[people.wan, people.ari, people.eli].flatMap((person) => [gapOneDay, gapTwoDay].map((day) => ({ membershipId: person.membershipId, day, kind: "OFF" as const }))),
		{ membershipId: people.omar.membershipId, day: gapOneDay, kind: "WORK" as const, shiftId: shifts.Morning },
		{ membershipId: people.lina.membershipId, day: gapTwoDay, kind: "WORK" as const, shiftId: shifts.Morning },
	];
	const shaped = await applyChange(manager, seed, operations, state.scheduleId, cells, "Set up the cover offer gaps");
	if (shaped.applied.status >= 300) throw new Error(`shaping the draft: ${shaped.applied.status} ${shaped.applied.text.slice(0, 300)}`);
	expectStatus(await manager.post(`${schedulePath(seed, operations, state.scheduleId)}/approval`), 200, "publish");
	// Leave approved after publication takes Omar and Lina off their Morning: two gaps that need cover.
	for (const [person, day] of [[people.omar, gapOneDay], [people.lina, gapTwoDay]] as const) {
		expectStatus(
			await manager.post(`~/member-profiles/${person.membershipId}/leave-requests/approved`, { leaveType: "ANNUAL", startDate: day, endDate: day, remark: "Approved after publishing", takeOffRosteredDays: true }),
			201,
			`leave for ${person.name}`
		);
	}
});

test("E2E-150 a shift on a day off asks for a yes: Send offer / They agreed; sent, it reads 'Offer sent to … · answer by …' with Withdraw, also after reopening; Day off keeps Apply", async ({ browser }, testInfo) => {
	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${state.scheduleId}`);
	await settle(page);
	state.issuesBefore = await issuesCount(page);
	await openCell(page, people.wan.name, "Tue: Day off");
	const panel = page.getByRole("complementary");
	await panel.getByRole("radio", { name: "A shift", exact: true }).check({ force: true });
	await panel.getByRole("button", { name: "Shift", exact: true }).click();
	await page.getByRole("option", { name: /^Morning/ }).click();
	await expect(panel.getByText(`The roster is published, so ${people.wan.name} must agree.`)).toBeVisible();
	const both = { agreed: await panel.getByRole("button", { name: "They agreed" }).count(), send: await panel.getByRole("button", { name: "Send offer" }).count(), apply: await panel.getByRole("button", { name: "Apply change" }).count() };
	await screen(page, testInfo, "E2E-150", "1-panel-asks-for-a-yes");
	await panel.getByRole("button", { name: "Send offer" }).click();
	const sentLine = panel.getByText(new RegExp(`^Offer sent to ${people.wan.name} · answer by `));
	await expect(sentLine).toBeVisible({ timeout: 20_000 });
	const sentText = (await sentLine.innerText()).trim();
	await screen(page, testInfo, "E2E-150", "2-offer-sent");

	await openCell(page, people.wan.name, "Tue");
	const reopened = await page.getByRole("complementary").getByText(new RegExp(`^Offer sent to ${people.wan.name}`)).count();
	const withdraw = await page.getByRole("complementary").getByRole("button", { name: "Withdraw offer" }).count();
	await screen(page, testInfo, "E2E-150", "3-reopened-offer-still-out");

	await openCell(page, people.eli.name, "Mon");
	const eliPanel = page.getByRole("complementary");
	const dayOffChoice = eliPanel.getByRole("radio", { name: "Day off", exact: true });
	let dayOffButtons = "(Eli is off on Monday)";
	if (await dayOffChoice.count()) {
		await dayOffChoice.check({ force: true });
		await settle(page);
		dayOffButtons = `Apply change ${await eliPanel.getByRole("button", { name: "Apply change" }).count()}, Send offer ${await eliPanel.getByRole("button", { name: "Send offer" }).count()}`;
		await screen(page, testInfo, "E2E-150", "4-day-off-keeps-apply");
	}
	const manager = await signIn("manager");
	const offers = rowsOf((await manager.get(offersPath())).data);
	state.offers["wan1"] = offers.find((offer: any) => offer.member?.membershipId === people.wan.membershipId && offer.rosterDate === gapOneDay)?.offerId;
	actual(testInfo, `panel buttons ${JSON.stringify(both)}; sent line "${sentText}"; after reopening: sent line ${reopened}, Withdraw offer ${withdraw}; day off: ${dayOffButtons}; offer ${state.offers["wan1"] ? "listed" : "missing"}`);
	expect(both).toEqual({ agreed: 1, send: 1, apply: 0 });
	expect(sentText).toMatch(/answer by \S+/);
	expect(reopened).toBe(1);
	expect(withdraw).toBe(1);
	expect(state.offers["wan1"]).toBeTruthy();
});

test("E2E-151 three offers race for one gap and a fourth is refused; Issues lists 'Offers out' and its count is unchanged", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const shifts = await rosterShifts(manager, seed, operations, state.scheduleId!);
	const ari = await sendOffer(manager, people.ari.membershipId, gapOneDay, shifts.Morning, state.offers["wan1"]!);
	const eli = await sendOffer(manager, people.eli.membershipId, gapOneDay, shifts.Morning, state.offers["wan1"]!);
	const fourth = await sendOffer(manager, memberOf("p7").membershipId, gapOneDay, shifts.Morning, state.offers["wan1"]!);
	state.offers["ari1"] = ari.data?.offerId;
	state.offers["eli1"] = eli.data?.offerId;

	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${state.scheduleId}`);
	await settle(page);
	const issuesAfter = await issuesCount(page);
	await page.getByRole("button", { name: /^Issues: \d+/ }).click();
	await settle(page);
	const panel = page.getByRole("complementary");
	const title = await panel.getByText("Offers out", { exact: true }).count();
	const summary = await panel.getByText("3 offers out · first yes wins").count();
	const waiting = await panel.getByText(/waiting, answer by/).count();
	await screen(page, testInfo, "E2E-151", "1-issues-offers-out");
	actual(testInfo, `Ari ${ari.status}, Eli ${eli.status}, fourth (Priya) ${fourth.status} ${fourth.errorCode ?? ""}; ${state.issuesBefore} → ${issuesAfter}; "Offers out" ${title}, summary ${summary}, waiting lines ${waiting}`);
	expect(ari.status).toBe(201);
	expect(eli.status).toBe(201);
	expect(fourth.status).toBe(409);
	expect(fourth.errorCode).toBe("COVER_OFFER_GROUP_FULL");
	expect(issuesAfter).toBe(state.issuesBefore);
	expect(title).toBe(1);
	expect(summary).toBe(1);
	expect(waiting).toBe(3);
});

test("E2E-152 the member's card: decline with a reason; the manager's Offers out shows it, a run-out offer and Withdraw per line", async ({ browser }, testInfo) => {
	const ariPage = await openAs(browser, "approver");
	await ariPage.goto(`/me/schedules/${state.scheduleId}?offer=${state.offers["ari1"]}`);
	await settle(ariPage);
	const card = ariPage.getByText("Shift offered", { exact: true });
	const cardShown = await card.count();
	const cardFacts = await Promise.all(["Was", "Pay", "Asked by", "Answer by"].map(async (term) => `${term}:${await ariPage.getByText(term, { exact: true }).count()}`));
	await screen(ariPage, testInfo, "E2E-152", "1-member-card");
	await ariPage.getByRole("button", { name: "Decline" }).first().click();
	await ariPage.getByRole("textbox").first().fill("Family visiting that morning");
	await screen(ariPage, testInfo, "E2E-152", "2-decline-reason");
	await ariPage.getByRole("button", { name: "Send decline" }).click();
	await expect(ariPage.getByText("Your answer was sent.").first()).toBeVisible({ timeout: 15_000 });
	await screen(ariPage, testInfo, "E2E-152", "3-decline-sent");

	// Eli's offer runs out: its deadline is moved into the past and the expiry sweep (every 30 s) closes it.
	execute(`UPDATE schedule_cover_offers SET expires_at = now() - interval '1 minute' WHERE uuid = ${literal(state.offers["eli1"]!)}`);
	const manager = await signIn("manager");
	let eliStatus = "";
	for (let attempt = 0; attempt < 30 && eliStatus !== "EXPIRED"; attempt++) {
		await new Promise((resolve) => setTimeout(resolve, 2_000));
		eliStatus = rowsOf((await manager.get(offersPath())).data).find((offer: any) => offer.offerId === state.offers["eli1"])?.status;
	}
	const page = await openAs(browser, "manager");
	await page.goto(`/scheduling/${state.scheduleId}`);
	await settle(page);
	await page.getByRole("button", { name: /^Issues: \d+/ }).click();
	await settle(page);
	const panel = page.getByRole("complementary");
	const declinedLine = await panel.getByText(/declined/).allInnerTexts();
	const reasonShown = await panel.getByText(/Family visiting that morning/).count();
	const ranOut = await panel.getByText(/ran out/).count();
	await screen(page, testInfo, "E2E-152", "4-offers-out-declined-ran-out");
	await panel.getByRole("button", { name: `Withdraw the offer to ${people.wan.name}` }).click();
	const confirm = page.getByRole("dialog");
	if (await confirm.count()) await confirm.getByRole("button", { name: /Withdraw/ }).last().click();
	await settle(page);
	const wanStatus = rowsOf((await manager.get(offersPath())).data).find((offer: any) => offer.offerId === state.offers["wan1"])?.status;
	await screen(page, testInfo, "E2E-152", "5-withdrawn-from-issues");

	const eliPage = await openAs(browser, "editor");
	await eliPage.goto(`/me/schedules/${state.scheduleId}?offer=${state.offers["eli1"]}`);
	await settle(eliPage);
	const eliClosed = await eliPage.getByText(/^Time ran out at /).count();
	await screen(eliPage, testInfo, "E2E-152", "6-member-card-ran-out");
	const wanPage = await openAs(browser, "worker");
	await wanPage.goto(`/me/schedules/${state.scheduleId}?offer=${state.offers["wan1"]}`);
	await settle(wanPage);
	const wanClosed = await wanPage.getByText("This offer is no longer open: someone else took the shift, or it was withdrawn.").count();
	await screen(wanPage, testInfo, "E2E-152", "7-member-card-withdrawn");
	actual(
		testInfo,
		`card ${cardShown} (${cardFacts.join(" ")}); Eli → ${eliStatus}; Offers out: declined lines "${declinedLine.join(" | ")}", reason shown ${reasonShown}, ran out ${ranOut}; Withdraw per line → Wan ${wanStatus}; Eli's card "Time ran out" ${eliClosed}; Wan's card closed-as-withdrawn ${wanClosed}`
	);
	expect(cardShown).toBe(1);
	expect(declinedLine.length).toBeGreaterThan(0);
	expect(reasonShown).toBeGreaterThan(0);
	expect(eliStatus).toBe("EXPIRED");
	expect(ranOut).toBe(1);
	expect(wanStatus).toBe("WITHDRAWN");
	expect(eliClosed).toBe(1);
	expect(wanClosed).toBe(1);
});

test("E2E-153 two offers race; the member accepts with one tap, the rival closes as taken; both inboxes say so", async ({ browser }, testInfo) => {
	const manager = await signIn("manager");
	const worker = await signIn("worker");
	const approver = await signIn("approver");
	const since = new Date().toISOString();
	const shifts = await rosterShifts(manager, seed, operations, state.scheduleId!);
	const wan = await sendOffer(manager, people.wan.membershipId, gapTwoDay, shifts.Morning, null);
	const ari = await sendOffer(manager, people.ari.membershipId, gapTwoDay, shifts.Morning, wan.data?.offerId);
	const sentNotice = await waitForNotification(worker, "COVER_OFFER_SENT", since);

	const wanPage = await openAs(browser, "worker");
	await wanPage.goto("/notifications");
	await settle(wanPage);
	const memberInbox = await wanPage.getByText(/^You’re offered a shift/).allInnerTexts();
	await screen(wanPage, testInfo, "E2E-153", "1-member-inbox-offer");
	await wanPage.goto(`/me/schedules/${state.scheduleId}?offer=${wan.data?.offerId}`);
	await settle(wanPage);
	await screen(wanPage, testInfo, "E2E-153", "2-member-card");
	await wanPage.getByRole("button", { name: "Accept" }).first().click();
	await expect(wanPage.getByText("You’re on the roster for this shift.").first()).toBeVisible({ timeout: 15_000 });
	await screen(wanPage, testInfo, "E2E-153", "3-accepted");
	const wanDay = await dayOf(manager, seed, operations, state.scheduleId!, people.wan.membershipId, gapTwoDay);
	const ariStatus = rowsOf((await approver.get("~/me/cover-offers")).data).find((offer: any) => offer.offerId === ari.data?.offerId)?.status;
	const answered = await waitForNotification(manager, "COVER_OFFER_ANSWERED", since);
	const managerPage = await openAs(browser, "manager");
	await managerPage.goto("/notifications");
	await settle(managerPage);
	const managerInbox = await managerPage.getByText(/^Your offer for .* was (accepted|declined)|^Nobody answered/).allInnerTexts();
	await screen(managerPage, testInfo, "E2E-153", "4-manager-inbox-answers");
	const allManagerNotices = (await notificationsOf(manager)).filter((row) => row.type === "COVER_OFFER_ANSWERED").map((row) => row.coverOffer?.outcome);
	actual(
		testInfo,
		`sent Wan ${wan.status}, Ari ${ari.status}; member notice ${sentNotice ? "yes" : "no"}, inbox "${memberInbox[0] ?? ""}"; Wan's ${gapTwoDay} now ${wanDay?.shift?.name ?? "off"}; Ari's rival offer ${ariStatus}; manager notice ${answered ? "yes" : "no"}, outcomes ${allManagerNotices.join(",")}, inbox lines "${managerInbox.join(" | ")}"`
	);
	expect(wan.status).toBe(201);
	expect(ari.status).toBe(201);
	expect(memberInbox.length).toBeGreaterThan(0);
	expect(wanDay?.shift?.name).toBe("Morning");
	expect(ariStatus).toBe("WITHDRAWN");
	expect(managerInbox.some((line) => line.includes("accepted"))).toBe(true);
	expect(managerInbox.some((line) => line.includes("declined"))).toBe(true);
});
