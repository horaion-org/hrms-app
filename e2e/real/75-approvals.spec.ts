import { expect, test } from "@playwright/test";

import { ApiClient, expectStatus, rowsOf } from "./support/api";
import { readAccounts, type Role } from "./support/environment";
import { readSeed, WEEKS } from "./support/seed-data";
import { createSchedule, generateAndWait, schedulePath } from "./support/schedules";
import { actual } from "./support/ui";

/**
 * Approvals API (ADR-0067) on Operations: with no flow publishing is unchanged; a two-step flow — the manager submits,
 * the admin endorses, the approver (named) approves and the roster publishes; a rejection; the submitter cannot
 * decide (403); a direct publish while one waits is 409. The flow is deleted at the end.
 */

const seed = readSeed();
const accounts = readAccounts();
const operations = seed.departments.operations;
const shiftIds = [seed.shifts.morning, seed.shifts.evening, seed.shifts.night];
const constraintIds = [seed.constraints.morning, seed.constraints.evening, seed.constraints.night];
const signIn = async (role: Role) => (await ApiClient.signIn(accounts.emails[role], accounts.password)).withCompany(seed.companyId);
const state: { flowId?: string; instanceId?: string; scheduleId?: string } = {};

async function generatedWeek(manager: ApiClient, name: string, periodStart: string): Promise<string> {
	const schedule = await createSchedule(manager, seed, operations, { name, periodStart, shiftIds, constraintIds });
	const result = await generateAndWait(manager, seed, operations, schedule.scheduleId);
	expect(result.status).toBe("GENERATED");
	return schedule.scheduleId;
}

test.describe.configure({ mode: "serial" });

test("E2E-090 with no flow, publishing is unchanged: published at once, no submission", async ({}, testInfo) => {
	const admin = await signIn("admin");
	const flows = rowsOf((await admin.get("~/approval-flows")).data);
	const instances = rowsOf((await admin.get(`~/approval-instances?subjectType=SCHEDULE_PUBLICATION&subjectId=${seed.schedules.draft}`)).data);
	const schedule = (await admin.get(schedulePath(seed, operations, seed.schedules.draft))).data;
	actual(testInfo, `flows ${flows.length}; week 48 status ${schedule.status}, submissions ${instances.length}, requiresApproval=${schedule.publication?.requiresApproval}`);
	expect(flows.length).toBe(0);
	expect(schedule.status).toBe("PUBLISHED");
	expect(instances.length).toBe(0);
});

test("E2E-091 two-step flow: submit → endorse → approve publishes; the submitter cannot decide; a direct publish waits (409)", async ({}, testInfo) => {
	const admin = await signIn("admin");
	const manager = await signIn("manager");
	const approver = await signIn("approver");
	const flow = expectStatus(
		await admin.post("~/approval-flows", {
			subjectType: "SCHEDULE_PUBLICATION",
			departmentId: operations,
			name: "Endorse then publish",
			steps: [
				{ label: "Endorse", rule: "KEY_HOLDERS", quorum: "ANY" },
				{ label: "Publish", rule: "MEMBERS", quorum: "ANY", memberIds: [seed.membershipIds.approver] },
			],
		}),
		201,
		"flow"
	);
	state.flowId = flow.approvalFlowId;
	const scheduleId = await generatedWeek(manager, "Ops approvals week", WEEKS.approvals);
	const path = schedulePath(seed, operations, scheduleId);
	const preview = (await manager.get(path)).data.publication;
	const submitted = await manager.post(`${path}/approval`);
	const afterSubmit = (await manager.get(path)).data.status;
	const instance = rowsOf((await admin.get(`~/approval-instances?subjectType=SCHEDULE_PUBLICATION&subjectId=${scheduleId}`)).data)[0];
	const direct = await manager.post(`${path}/approval`);
	const bySubmitter = await manager.post(`~/approval-instances/${instance.approvalInstanceId}/decisions`, { stepOrder: 1, decision: "APPROVE", comment: "self" });
	const pendingForApprover = rowsOf((await approver.get("~/me/approval-instances/pending")).data).length;
	const endorse = await admin.post(`~/approval-instances/${instance.approvalInstanceId}/decisions`, { stepOrder: 1, decision: "APPROVE", comment: "Looks right" });
	const adminOnStep2 = await admin.post(`~/approval-instances/${instance.approvalInstanceId}/decisions`, { stepOrder: 2, decision: "APPROVE", comment: "not named" });
	const approve = await approver.post(`~/approval-instances/${instance.approvalInstanceId}/decisions`, { stepOrder: 2, decision: "APPROVE", comment: "Publish it" });
	const final = (await manager.get(path)).data.status;
	actual(
		testInfo,
		`preview requiresApproval=${preview?.requiresApproval} steps=${(preview?.stepLabels ?? []).join(">")}; submit ${submitted.status} → status ${afterSubmit}; direct publish while pending → ${direct.status} ${direct.errorCode ?? ""}; manager (submitter, no approval keys) decides → ${bySubmitter.status} ${bySubmitter.errorCode ?? ""}; approver pending list ${pendingForApprover}; endorse (admin) ${endorse.status}; admin on named step → ${adminOnStep2.status} ${adminOnStep2.errorCode ?? ""}; approve (approver) ${approve.status}; final ${final}`
	);
	expect(submitted.status).toBe(200);
	expect(afterSubmit).toBe("GENERATED");
	expect(direct.status).toBe(409);
	expect(bySubmitter.status).toBe(403);
	expect(endorse.status).toBe(200);
	expect(adminOnStep2.status).toBe(403);
	expect(approve.status).toBe(200);
	expect(final).toBe("PUBLISHED");
});

test("E2E-092 the requester cannot decide its own submission (403); a rejection rejects the roster with the approver's reason; the requester is told", async ({}, testInfo) => {
	const admin = await signIn("admin");
	const manager = await signIn("manager");
	const approver = await signIn("approver");
	const scheduleId = await generatedWeek(manager, "Ops rejected week", WEEKS.approvalsReject);
	const path = schedulePath(seed, operations, scheduleId);
	// The admin submits: it holds approval:decide, so its own decision is refused by the requester rule, not the guard.
	const submitted = await admin.post(`${path}/approval`);
	const instance = rowsOf((await admin.get(`~/approval-instances?subjectType=SCHEDULE_PUBLICATION&subjectId=${scheduleId}`)).data)[0];
	const own = await admin.post(`~/approval-instances/${instance.approvalInstanceId}/decisions`, { stepOrder: 1, decision: "APPROVE", comment: "my own" });
	const reject = await approver.post(`~/approval-instances/${instance.approvalInstanceId}/decisions`, { stepOrder: 1, decision: "REJECT", comment: "Two nights have no supervisor" });
	const schedule = (await manager.get(path)).data;
	await new Promise((resolve) => setTimeout(resolve, 7_000));
	const answer = await admin.get("~/me/notifications?page=0&size=100");
	const told = rowsOf(answer.data ?? answer.body).filter((row: any) => row.type === "APPROVAL_DECIDED").length;
	actual(testInfo, `admin submits ${submitted.status}; admin decides its own submission → ${own.status} ${own.errorCode ?? ""}; reject (approver) ${reject.status}; schedule ${schedule.status}, reason "${schedule.rejectionReason}"; requester APPROVAL_DECIDED notices: ${told}`);
	expect(submitted.status).toBe(200);
	expect(own.status).toBe(403);
	expect(own.errorCode).toBe("OWN_APPROVAL_DENIED");
	expect(reject.status).toBe(200);
	expect(schedule.status).toMatch(/REJECTED|DRAFT/);
	expect(told).toBeGreaterThan(0);
	await admin.delete(`~/approval-flows/${state.flowId}`);
});
