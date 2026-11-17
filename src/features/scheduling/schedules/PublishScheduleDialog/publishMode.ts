import type {
	ApprovalStanding,
	OpenStep,
} from "@/features/approvals/approvalStanding";

/**
 * What confirming does: publish in one step (no flow), submit the roster to
 * its flow's steps, or approve the open step of its submission.
 */
export type PublishMode =
	| { kind: "publish" }
	| { kind: "submit"; stepLabels: ReadonlyArray<string> }
	| {
			kind: "approve";
			instanceId: string;
			step: OpenStep;
			/** The step asked after this one; none on the last step. */
			nextLabel?: string;
	  };

/**
 * What the roster page's primary button confirms, by where the viewer stands
 * on the roster's approval: submit to the flow, approve the open step (naming
 * the step after it from the submission's steps), or publish.
 */
export const publishModeOf = (
	standing: ApprovalStanding,
	instanceSteps: ReadonlyArray<{ stepOrder: number; label: string }>
): PublishMode => {
	if (standing.kind === "toSubmit")
		return { kind: "submit", stepLabels: standing.stepLabels };
	if (standing.kind === "pending")
		return {
			kind: "approve",
			instanceId: standing.instanceId,
			step: standing.step,
			nextLabel: instanceSteps.find(
				(step) => step.stepOrder === standing.step.order + 1
			)?.label,
		};
	return { kind: "publish" };
};
