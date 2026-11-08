import type {
	ApprovalInstance,
	ApprovalInstanceStep,
} from "@/features/approvals/api";

/** What the page could read of a subject's submission. */
export type ApprovalRead =
	/** Not asked: the caller can't read approvals here. */
	| { status: "unread" }
	| { status: "loading" }
	| { status: "failed" }
	/** Read; `instance` is the subject's current submission, if any. */
	| { status: "ready"; instance: ApprovalInstance | null };

/** The step a pending submission waits on. */
export type OpenStep = {
	order: number;
	/** How many steps the submission has. */
	count: number;
	label: string;
	/** Its approval decides the subject (publishes the roster). */
	isLast: boolean;
};

/**
 * Where the viewer stands on a subject awaiting its decision:
 * - `direct`: no flow applies; Publish decides in one step, as before approvals;
 * - `toSubmit`: a flow applies and nothing waits; Publish submits it;
 * - `pending`: a submission waits on `step`, and the viewer is the one to
 *   decide it (`decider`), its submitter, or neither (`waiting`);
 * - `unknown`: a flow applies but its submission is still loading, or failed
 *   to load; no decision button is offered rather than a guessed one.
 */
export type ApprovalStanding =
	| { kind: "direct" }
	| { kind: "toSubmit"; stepLabels: ReadonlyArray<string> }
	| {
			kind: "pending";
			role: "decider" | "submitter" | "waiting";
			step: OpenStep;
	  }
	| { kind: "unknown"; failed: boolean };

export type ApprovalStandingFacts = {
	/** The subject waits on a decision (a GENERATED roster with no run open). */
	awaitingDecision: boolean;
	/** How deciding goes at the subject's department now, from the subject's own read. */
	publication: { requiresApproval: boolean; stepLabels: ReadonlyArray<string> };
	read: ApprovalRead;
	viewerMembershipId: string;
};

/** The step a submission waits on; none once it has ended. */
export const openStepOf = (
	instance: ApprovalInstance
): OpenStep | undefined => {
	if (instance.status !== "PENDING") return undefined;
	const step = instance.steps.find(
		(candidate) => candidate.stepOrder === instance.currentStepOrder
	);
	if (!step) return undefined;
	const lastOrder = Math.max(...instance.steps.map((each) => each.stepOrder));
	return {
		order: step.stepOrder,
		count: instance.steps.length,
		label: step.label,
		isLast: step.stepOrder === lastOrder,
	};
};

/** The step that rejected a submission, if it was rejected. */
export const rejectedStepOf = (
	instance: ApprovalInstance | null | undefined
): ApprovalInstanceStep | undefined =>
	instance?.status === "REJECTED"
		? instance.steps.find((step) => step.status === "REJECTED")
		: undefined;

const time = (instant: string): number => new Date(instant).getTime();

/**
 * The submission that belongs to the subject's current roster: the newest
 * one submitted since its latest generation. An older one belongs to a
 * roster since generated again, and says nothing about this one.
 */
export const currentInstanceOf = (
	instances: ReadonlyArray<ApprovalInstance>,
	generatedSince: string | null
): ApprovalInstance | null =>
	instances.find(
		(instance) =>
			generatedSince === null ||
			time(instance.submittedAt) >= time(generatedSince)
	) ?? null;

const roleOf = (
	instance: ApprovalInstance,
	viewerMembershipId: string
): "decider" | "submitter" | "waiting" => {
	if (instance.canDecide === true) return "decider";
	return instance.requestedBy?.membershipId === viewerMembershipId
		? "submitter"
		: "waiting";
};

/** Where the viewer stands; see `ApprovalStanding`. */
export const approvalStanding = ({
	awaitingDecision,
	publication,
	read,
	viewerMembershipId,
}: ApprovalStandingFacts): ApprovalStanding => {
	if (!awaitingDecision) return { kind: "direct" };
	const withoutSubmission: ApprovalStanding = publication.requiresApproval
		? { kind: "toSubmit", stepLabels: publication.stepLabels }
		: { kind: "direct" };
	switch (read.status) {
		case "unread":
			return withoutSubmission;
		case "loading":
			return { kind: "unknown", failed: false };
		case "failed":
			return publication.requiresApproval
				? { kind: "unknown", failed: true }
				: withoutSubmission;
		case "ready": {
			const step = read.instance && openStepOf(read.instance);
			if (!read.instance || !step) return withoutSubmission;
			return {
				kind: "pending",
				role: roleOf(read.instance, viewerMembershipId),
				step,
			};
		}
	}
};

/** One line of copy: its key under `approvals` and the values it takes. */
export type ApprovalLine = {
	key:
		| "approvals.meta.waitingOnYou"
		| "approvals.meta.waiting"
		| "approvals.meta.needsApproval"
		| "approvals.meta.failed";
	values: Record<string, string | number>;
};

const stepValues = (step: OpenStep): Record<string, string | number> => ({
	step: step.order,
	total: step.count,
	label: step.label,
});

/** The steps in order as one phrase: "Endorse → Publish". */
export const stepSummary = (labels: ReadonlyArray<string>): string =>
	labels.join(" → ");

/**
 * The header's meta line for a standing: "Waiting on you · step 1 of 2
 * (Endorse)", "Waiting for approval · …", what submitting goes through, or
 * that the submission couldn't be read. None without a flow.
 */
export const approvalMetaLine = (
	standing: ApprovalStanding
): ApprovalLine | undefined => {
	switch (standing.kind) {
		case "pending":
			return {
				key:
					standing.role === "decider"
						? "approvals.meta.waitingOnYou"
						: "approvals.meta.waiting",
				values: stepValues(standing.step),
			};
		case "toSubmit":
			return {
				key: "approvals.meta.needsApproval",
				values: { steps: stepSummary(standing.stepLabels) },
			};
		case "unknown":
			return standing.failed
				? { key: "approvals.meta.failed", values: {} }
				: undefined;
		case "direct":
			return undefined;
	}
};

/**
 * A schedule card's approval line, from the caller's own waiting list:
 * "Waiting on you · step 2 of 2 (Publish)" when one of its steps waits on
 * them, else what publishing it goes through. None without a flow, or once
 * decided.
 */
export const scheduleCardApprovalLine = (
	schedule: {
		scheduleId: string;
		awaitingDecision: boolean;
		publication: ApprovalStandingFacts["publication"];
	},
	waitingOnMe: ReadonlyArray<ApprovalInstance>
): ApprovalLine | undefined => {
	if (!schedule.awaitingDecision) return undefined;
	const mine = waitingOnMe.find(
		(instance) => instance.subjectId === schedule.scheduleId
	);
	const step = mine && openStepOf(mine);
	if (step)
		return { key: "approvals.meta.waitingOnYou", values: stepValues(step) };
	return schedule.publication.requiresApproval
		? {
				key: "approvals.meta.needsApproval",
				values: { steps: stepSummary(schedule.publication.stepLabels) },
			}
		: undefined;
};
