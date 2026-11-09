import { describe, expect, it } from "vitest";
import {
	approvalMetaLine,
	approvalStanding,
	currentInstanceOf,
	scheduleCardApprovalLine,
	type ApprovalStanding,
	type ApprovalStandingFacts,
} from "@/features/approvals/approvalStanding";
import {
	approvalInstanceFixture,
	atStepTwoFixture,
	JOSE,
	rejectedAtEndorseFixture,
} from "@/features/approvals/fixtures";

const NO_FLOW = { requiresApproval: false, stepLabels: [], submission: null };
const FLOW = {
	requiresApproval: true,
	stepLabels: ["Endorse", "Publish"],
	submission: null,
};
/** Step 1 of 2 waiting, as the schedule read reports it to every reader. */
const SUBMITTED = (
	submittedByCaller: boolean
): ApprovalStandingFacts["publication"] => ({
	...FLOW,
	submission: {
		approvalInstanceId: "ai-1",
		currentStepOrder: 1,
		currentStepLabel: "Endorse",
		stepCount: 2,
		submittedByCaller,
	},
});

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

const pending = (
	role: "decider" | "submitter" | "waiting",
	step: typeof STEP_ONE
): ApprovalStanding => ({ kind: "pending", role, step, instanceId: "ai-1" });

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
			expected: pending("decider", STEP_ONE),
		},
		{
			name: "pending step 1, the viewer may not decide it",
			given: facts({
				read: {
					status: "ready",
					instance: approvalInstanceFixture({ canDecide: false }),
				},
			}),
			expected: pending("waiting", STEP_ONE),
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
			expected: pending("submitter", STEP_ONE),
		},
		{
			name: "the last step is open",
			given: facts({
				read: {
					status: "ready",
					instance: atStepTwoFixture({ canDecide: true }),
				},
			}),
			expected: pending("decider", STEP_TWO),
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
			expected: pending("waiting", STEP_ONE),
		},
		{
			name: "approvals not readable here: the flow alone decides",
			given: facts({ read: { status: "unread" } }),
			expected: { kind: "toSubmit", stepLabels: ["Endorse", "Publish"] },
		},
		{
			name: "approvals not readable here, the viewer submitted it: the schedule read says where it waits",
			given: facts({
				publication: SUBMITTED(true),
				read: { status: "unread" },
			}),
			expected: pending("submitter", STEP_ONE),
		},
		{
			name: "approvals not readable here, someone else submitted it: it waits, never the viewer's to decide",
			given: facts({
				publication: SUBMITTED(false),
				read: { status: "unread" },
			}),
			expected: pending("waiting", STEP_ONE),
		},
		{
			name: "approvals not readable here, the flow removed after submission: it still waits",
			given: facts({
				publication: { ...SUBMITTED(true), requiresApproval: false },
				read: { status: "unread" },
			}),
			expected: pending("submitter", STEP_ONE),
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
		expect(approvalMetaLine(pending("decider", STEP_ONE))).toEqual({
			key: "approvals.meta.waitingOnYou",
			values: { step: 1, total: 2, label: "Endorse" },
		});
		expect(approvalMetaLine(pending("submitter", STEP_TWO))).toEqual({
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

	it("says it waits for approval when someone else's step is open", () => {
		expect(
			scheduleCardApprovalLine(
				{ ...schedule, publication: SUBMITTED(true) },
				[]
			)
		).toEqual({
			key: "approvals.meta.waiting",
			values: { step: 1, total: 2, label: "Endorse" },
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
