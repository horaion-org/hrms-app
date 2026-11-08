import { describe, expect, it } from "vitest";
import {
	approvalMetaLine,
	approvalStanding,
	currentInstanceOf,
	rejectedStepOf,
	scheduleCardApprovalLine,
	type ApprovalStandingFacts,
} from "@/features/approvals/approvalStanding";
import {
	approvalInstanceFixture,
	atStepTwoFixture,
	JOSE,
	rejectedAtEndorseFixture,
} from "@/features/approvals/fixtures";

const NO_FLOW = { requiresApproval: false, stepLabels: [] };
const FLOW = { requiresApproval: true, stepLabels: ["Endorse", "Publish"] };

const facts = (
	overrides: Partial<ApprovalStandingFacts> = {}
): ApprovalStandingFacts => ({
	awaitingDecision: true,
	publication: FLOW,
	read: { status: "ready", instance: null },
	viewerMembershipId: "m-1",
	...overrides,
});

const STEP_ONE = { order: 1, count: 2, label: "Endorse", isLast: false };
const STEP_TWO = { order: 2, count: 2, label: "Publish", isLast: true };

describe("approvalStanding", () => {
	it.each([
		{
			name: "no flow: Publish decides in one step",
			given: facts({ publication: NO_FLOW }),
			expected: { kind: "direct" },
		},
		{
			name: "a flow and nothing submitted: Publish submits",
			given: facts(),
			expected: { kind: "toSubmit", stepLabels: ["Endorse", "Publish"] },
		},
		{
			name: "pending step 1, the viewer may decide it",
			given: facts({
				read: {
					status: "ready",
					instance: approvalInstanceFixture({ canDecide: true }),
				},
			}),
			expected: { kind: "pending", role: "decider", step: STEP_ONE },
		},
		{
			name: "pending step 1, the viewer may not decide it",
			given: facts({
				read: {
					status: "ready",
					instance: approvalInstanceFixture({ canDecide: false }),
				},
			}),
			expected: { kind: "pending", role: "waiting", step: STEP_ONE },
		},
		{
			name: "pending step 1, the viewer submitted it",
			given: facts({
				viewerMembershipId: JOSE.membershipId,
				read: {
					status: "ready",
					instance: approvalInstanceFixture({ canDecide: false }),
				},
			}),
			expected: { kind: "pending", role: "submitter", step: STEP_ONE },
		},
		{
			name: "the last step is open",
			given: facts({
				read: {
					status: "ready",
					instance: atStepTwoFixture({ canDecide: true }),
				},
			}),
			expected: { kind: "pending", role: "decider", step: STEP_TWO },
		},
		{
			name: "a rejected submission waits on nothing (the roster is no longer awaiting)",
			given: facts({
				awaitingDecision: false,
				read: { status: "ready", instance: rejectedAtEndorseFixture() },
			}),
			expected: { kind: "direct" },
		},
		{
			name: "a flow removed after submission still shows the submission",
			given: facts({
				publication: NO_FLOW,
				read: { status: "ready", instance: approvalInstanceFixture() },
			}),
			expected: { kind: "pending", role: "waiting", step: STEP_ONE },
		},
		{
			name: "approvals not readable here: the flow alone decides",
			given: facts({ read: { status: "unread" } }),
			expected: { kind: "toSubmit", stepLabels: ["Endorse", "Publish"] },
		},
		{
			name: "still loading: no guess",
			given: facts({ read: { status: "loading" } }),
			expected: { kind: "unknown", failed: false },
		},
		{
			name: "failed with a flow: no guess, and say so",
			given: facts({ read: { status: "failed" } }),
			expected: { kind: "unknown", failed: true },
		},
		{
			name: "failed without a flow: Publish as before",
			given: facts({ publication: NO_FLOW, read: { status: "failed" } }),
			expected: { kind: "direct" },
		},
	])("$name", ({ given, expected }) => {
		expect(approvalStanding(given)).toEqual(expected);
	});
});

describe("approvalMetaLine", () => {
	it("says whose turn it is, with the step", () => {
		expect(
			approvalMetaLine({ kind: "pending", role: "decider", step: STEP_ONE })
		).toEqual({
			key: "approvals.meta.waitingOnYou",
			values: { step: 1, total: 2, label: "Endorse" },
		});
		expect(
			approvalMetaLine({ kind: "pending", role: "submitter", step: STEP_TWO })
		).toEqual({
			key: "approvals.meta.waiting",
			values: { step: 2, total: 2, label: "Publish" },
		});
	});

	it("previews the steps before submission, and says nothing without a flow", () => {
		expect(
			approvalMetaLine({ kind: "toSubmit", stepLabels: ["Endorse", "Publish"] })
		).toEqual({
			key: "approvals.meta.needsApproval",
			values: { steps: "Endorse → Publish" },
		});
		expect(approvalMetaLine({ kind: "direct" })).toBeUndefined();
		expect(
			approvalMetaLine({ kind: "unknown", failed: false })
		).toBeUndefined();
		expect(approvalMetaLine({ kind: "unknown", failed: true })?.key).toBe(
			"approvals.meta.failed"
		);
	});
});

describe("currentInstanceOf", () => {
	it("keeps the newest submission made since the roster's latest generation", () => {
		const current = approvalInstanceFixture({
			approvalInstanceId: "new",
			submittedAt: "2026-10-12T00:00:00Z",
		});
		const older = approvalInstanceFixture({
			approvalInstanceId: "old",
			submittedAt: "2026-10-05T00:00:00Z",
		});
		expect(currentInstanceOf([current, older], "2026-10-11T00:00:00Z")).toBe(
			current
		);
		expect(currentInstanceOf([older], "2026-10-11T00:00:00Z")).toBeNull();
		expect(currentInstanceOf([older], null)).toBe(older);
		expect(currentInstanceOf([], null)).toBeNull();
	});
});

describe("rejectedStepOf", () => {
	it("names the step that rejected, and nothing otherwise", () => {
		expect(rejectedStepOf(rejectedAtEndorseFixture())?.label).toBe("Endorse");
		expect(rejectedStepOf(approvalInstanceFixture())).toBeUndefined();
		expect(rejectedStepOf(null)).toBeUndefined();
	});
});

describe("scheduleCardApprovalLine", () => {
	const schedule = {
		scheduleId: "s-1",
		awaitingDecision: true,
		publication: FLOW,
	};

	it("says it waits on the viewer when their list holds it", () => {
		expect(scheduleCardApprovalLine(schedule, [atStepTwoFixture()])).toEqual({
			key: "approvals.meta.waitingOnYou",
			values: { step: 2, total: 2, label: "Publish" },
		});
	});

	it("otherwise says what publishing goes through, and nothing once decided or without a flow", () => {
		expect(scheduleCardApprovalLine(schedule, [])?.key).toBe(
			"approvals.meta.needsApproval"
		);
		expect(
			scheduleCardApprovalLine({ ...schedule, publication: NO_FLOW }, [])
		).toBeUndefined();
		expect(
			scheduleCardApprovalLine({ ...schedule, awaitingDecision: false }, [
				atStepTwoFixture(),
			])
		).toBeUndefined();
	});
});
