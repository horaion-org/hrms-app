import type {
	ApprovalFlow,
	ApprovalInstance,
	ApprovalInstanceStep,
} from "@/features/approvals/api";

/** José (m-2) submitted; Siti (m-3) and Ahmad (m-4) are named approvers. */
export const JOSE = { membershipId: "m-2", displayName: "José Cruz" };
export const SITI = { membershipId: "m-3", displayName: "Siti Rahman" };
export const AHMAD = { membershipId: "m-4", displayName: "Ahmad Ali" };

/** Step 1 "Endorse", open, decided by anyone who can publish. */
export const endorseStep = (
	overrides: Partial<ApprovalInstanceStep> = {}
): ApprovalInstanceStep => ({
	stepOrder: 1,
	label: "Endorse",
	rule: "KEY_HOLDERS",
	quorum: "ANY",
	status: "OPEN",
	members: [],
	decisions: [],
	...overrides,
});

/** Step 2 "Publish", not reached yet. */
export const publishStep = (
	overrides: Partial<ApprovalInstanceStep> = {}
): ApprovalInstanceStep => ({
	stepOrder: 2,
	label: "Publish",
	rule: "KEY_HOLDERS",
	quorum: "ANY",
	status: "WAITING",
	members: [],
	decisions: [],
	...overrides,
});

/** Siti's approval of step 1, with a comment. */
export const sitiApproved = {
	decidedBy: SITI,
	decision: "APPROVE" as const,
	comment: "Covered by Ahmad on Sat.",
	decidedAt: "2026-10-10T01:10:00Z",
};

/** A submission of schedule s-1 by José, waiting on step 1 of 2. */
export const approvalInstanceFixture = (
	overrides: Partial<ApprovalInstance> = {}
): ApprovalInstance => ({
	approvalInstanceId: "ai-1",
	subjectType: "SCHEDULE_PUBLICATION",
	subjectId: "s-1",
	departmentId: "d-1",
	approvalFlowId: "af-1",
	requestedBy: JOSE,
	status: "PENDING",
	currentStepOrder: 1,
	submittedAt: "2026-10-09T10:02:00Z",
	decidedAt: null,
	steps: [endorseStep(), publishStep()],
	canDecide: null,
	eligibleCount: null,
	...overrides,
});

/** The same submission once Siti approved step 1: step 2 is open. */
export const atStepTwoFixture = (
	overrides: Partial<ApprovalInstance> = {}
): ApprovalInstance =>
	approvalInstanceFixture({
		currentStepOrder: 2,
		steps: [
			endorseStep({ status: "APPROVED", decisions: [sitiApproved] }),
			publishStep({ status: "OPEN" }),
		],
		...overrides,
	});

/** Rejected at step 1 by Siti. */
export const rejectedAtEndorseFixture = (): ApprovalInstance =>
	approvalInstanceFixture({
		status: "REJECTED",
		currentStepOrder: null,
		decidedAt: "2026-10-10T01:10:00Z",
		steps: [
			endorseStep({
				status: "REJECTED",
				decisions: [
					{
						decidedBy: SITI,
						decision: "REJECT",
						comment: "Two nights have no supervisor.",
						decidedAt: "2026-10-10T01:10:00Z",
					},
				],
			}),
			publishStep(),
		],
	});

/** Front Office's (d-1) flow: Endorse by Siti and Ahmad, all of them, then Publish by anyone. */
export const approvalFlowFixture = (
	overrides: Partial<ApprovalFlow> = {}
): ApprovalFlow => ({
	approvalFlowId: "af-1",
	subjectType: "SCHEDULE_PUBLICATION",
	departmentId: "d-1",
	name: "Front Office publishing",
	active: true,
	steps: [
		{
			stepOrder: 1,
			label: "Endorse",
			rule: "MEMBERS",
			quorum: "ALL",
			members: [AHMAD, SITI],
		},
		{
			stepOrder: 2,
			label: "Publish",
			rule: "KEY_HOLDERS",
			quorum: "ANY",
			members: [],
		},
	],
	createdAt: "2026-10-01T00:00:00Z",
	updatedAt: "2026-10-01T00:00:00Z",
	...overrides,
});

/** The company-wide flow: one Publish step. */
export const companyFlowFixture = (): ApprovalFlow =>
	approvalFlowFixture({
		approvalFlowId: "af-0",
		departmentId: null,
		name: "Company publishing",
		steps: [
			{
				stepOrder: 1,
				label: "Publish",
				rule: "KEY_HOLDERS",
				quorum: "ANY",
				members: [],
			},
		],
	});
