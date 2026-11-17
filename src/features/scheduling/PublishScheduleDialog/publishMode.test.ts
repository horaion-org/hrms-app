import { describe, expect, it } from "vitest";
import type {
	ApprovalStanding,
	OpenStep,
} from "@/features/approvals/approvalStanding";
import { publishModeOf } from "@/features/scheduling/PublishScheduleDialog/publishMode";

/** The first of a submission's three steps. */
const FIRST_STEP: OpenStep = {
	order: 1,
	count: 3,
	label: "Head chef",
	isLast: false,
};

/** The submission's steps, as its approval instance lists them. */
const INSTANCE_STEPS = [
	{ stepOrder: 1, label: "Head chef" },
	{ stepOrder: 2, label: "Area manager" },
	{ stepOrder: 3, label: "HR" },
];

describe("publishModeOf", () => {
	it("submits a roster whose Department has a flow and nothing submitted yet", () => {
		const standing: ApprovalStanding = {
			kind: "toSubmit",
			stepLabels: ["Head chef", "HR"],
		};

		expect(publishModeOf(standing, [])).toEqual({
			kind: "submit",
			stepLabels: ["Head chef", "HR"],
		});
	});

	it("approves a waiting step, naming the step after it", () => {
		const standing: ApprovalStanding = {
			kind: "pending",
			role: "decider",
			step: FIRST_STEP,
			instanceId: "i-1",
		};

		expect(publishModeOf(standing, INSTANCE_STEPS)).toEqual({
			kind: "approve",
			instanceId: "i-1",
			step: FIRST_STEP,
			nextLabel: "Area manager",
		});
	});

	it("names no next step on the last step, or before the steps are read", () => {
		const last: ApprovalStanding = {
			kind: "pending",
			role: "decider",
			step: { ...FIRST_STEP, order: 3, isLast: true },
			instanceId: "i-1",
		};
		const unread: ApprovalStanding = { ...last, step: FIRST_STEP };

		expect(publishModeOf(last, INSTANCE_STEPS)).toMatchObject({
			kind: "approve",
			nextLabel: undefined,
		});
		expect(publishModeOf(unread, [])).toMatchObject({
			kind: "approve",
			nextLabel: undefined,
		});
	});

	it.each<ApprovalStanding>([
		{ kind: "direct" },
		{ kind: "unknown", failed: false },
	])("publishes in one step otherwise: %o", (standing) => {
		expect(publishModeOf(standing, INSTANCE_STEPS)).toEqual({
			kind: "publish",
		});
	});
});
