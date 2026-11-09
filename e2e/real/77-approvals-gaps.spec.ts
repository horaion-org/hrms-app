import { existsSync, readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

import { literal, queryRows } from "./support/database";
import { APPROVALS_SEEN_FILE, readAccounts } from "./support/environment";
import { readSeed } from "./support/seed-data";
import { actual } from "./support/ui";

/**
 * Judges what 76-approvals-ui saw of three gaps, one case each and not serial, so one failing does not skip the
 * others: a submitter without approval:read (D-11), the P3 notices and the skipped step in the app (D-12), and
 * approval requests sent to people who cannot decide (D-19).
 */

type Seen = {
	managerRequests?: number;
	managerDecides?: string;
	managerRejected?: string;
	submitterMeta?: string;
	submitAfterSubmit?: number;
	submitterMenu?: string[];
	cancelledGeneric?: number;
	stalledGeneric?: number;
	skippedTrail?: string;
};

/** Read inside each case: 76-approvals-ui writes the file in its afterAll, after this file may have loaded. */
const readSeen = (): Seen => (existsSync(APPROVALS_SEEN_FILE) ? (JSON.parse(readFileSync(APPROVALS_SEEN_FILE, "utf8")) as Seen) : {});
const approverName = readSeed().members.find((member) => member.key === "approver")!.name;

test("E2E-149 a submitter without approval:read sees their own submission waiting, can withdraw it, and sees which step rejected it", async ({}, testInfo) => {
	const seen = readSeen();
	actual(
		testInfo,
		`manager (schedule:publish, no approval:read) right after submitting: meta "${seen.submitterMeta}", Submit still offered ${seen.submitAfterSubmit}; ⋯ menu ${(seen.submitterMenu ?? []).join(", ")}; after a rejection at step 2: "${seen.managerRejected}"`
	);
	expect.soft(seen.submitterMeta).toBe("Waiting for approval · step 1 of 2 (Endorse)");
	expect.soft(seen.submitAfterSubmit).toBe(0);
	expect.soft(seen.managerRejected ?? "").toMatch(/^Rejected at Sign off/);
	expect(seen.submitterMenu ?? []).toContain("Withdraw from approval");
});

test("E2E-139 P3 in the app: the cancelled and stalled notices read in words; the trail names who skipped a step", async ({}, testInfo) => {
	const seen = readSeen();
	actual(
		testInfo,
		`inbox rows reading "You have a new notification.": submitter after APPROVAL_CANCELLED ${seen.cancelledGeneric}, flow manager after APPROVAL_STEP_STALLED ${seen.stalledGeneric}; skipped trail "${(seen.skippedTrail ?? "").slice(0, 200)}"`
	);
	expect.soft(seen.stalledGeneric).toBe(0);
	expect.soft(seen.skippedTrail ?? "").toMatch(new RegExp(`Skipped[^·]*${approverName}|${approverName}[^·]*Skipped`));
	expect(seen.cancelledGeneric).toBe(0);
});

test("E2E-138 approval requests go only to people who can decide the step", async ({}, testInfo) => {
	const seen = readSeen();
	// The inbox read hides these rows from both views, so delivery is read from the database.
	const delivered = queryRows(
		`SELECT count(*) AS rows FROM notification_events e JOIN notifications n ON n.event_id = e.id
		 JOIN company_memberships m ON m.id = n.recipient_membership_id JOIN users u ON u.id = m.user_id
		 WHERE e.type = 'APPROVAL_REQUESTED' AND u.email = ${literal(readAccounts().emails.manager)}`
	)[0]?.["rows"];
	actual(
		testInfo,
		`APPROVAL_REQUESTED delivered to the manager (schedule:publish, no approval:decide): ${delivered}; shown in its inbox (For you + Needs review): ${seen.managerRequests}; its decision on the step it was asked about → ${seen.managerDecides}`
	);
	expect(Number(delivered)).toBe(0);
});
