import type { ApprovalStanding } from "@/features/approvals/approvalStanding";
import type { Schedule } from "@/features/scheduling/schedules/api";

/** The roster page's own actions; Export and Delete stay with `ScheduleMenu`. */
export type ScheduleActionId =
	| "approve"
	| "approveAndPublish"
	| "publish"
	| "submit"
	| "reject"
	| "withdrawApproval"
	| "regenerate"
	| "viewSetup"
	| "details";

/**
 * Where the viewer stands on the roster's approval: no submission waits
 * (`none`), its open step is theirs to decide, they submitted it, it waits
 * on someone else, or it could not be told yet (`unknown`).
 */
export type ApprovalActionStanding =
	"none" | "mineToDecide" | "mineAsSubmitter" | "waiting" | "unknown";

/** What decides which actions a person is offered on one schedule. */
export type ScheduleActionFacts = {
	status: Schedule["status"];
	/** Holds `schedule:publish`, the roster is decidable and its week is not published elsewhere. */
	mayPublish: boolean;
	/** Holds `schedule:publish` and the roster is decidable. */
	mayReject: boolean;
	/** Holds `schedule:generate`, it is regenerable and its week is not published elsewhere. */
	mayRegenerate: boolean;
	/** Has a roster, so its history has something to tell. */
	hasRoster: boolean;
	approvalStanding: ApprovalActionStanding;
	/** The step the viewer decides is the last: their approval publishes. */
	isLastStep: boolean;
	/** A flow applies at the department, so Publish submits the roster. */
	flowRequired: boolean;
};

export type ScheduleAction = {
	id: ScheduleActionId;
	labelKey:
		| "approvals.actions.approve"
		| "approvals.actions.approveAndPublish"
		| "approvals.actions.submit"
		| "approvals.actions.withdraw"
		| "scheduling.decision.publish"
		| "scheduling.decision.reject"
		| "scheduling.regenerate.button"
		| "scheduling.detail.viewSetup"
		| "scheduling.detail.details.title";
	/** The status where this is the page's one primary button; otherwise it is in the menu. */
	primaryWhen?: Schedule["status"];
	offered: (facts: ScheduleActionFacts) => boolean;
};

/**
 * Every action the roster page offers, in menu order. Each is the one
 * primary button in the status `primaryWhen` names (the first offered one
 * wins) and a "More actions" item otherwise, and is offered only where
 * `offered` says. While a submission waits, only the person whose step it
 * is gets a decision (Approve, or Approve and publish on the last step, and
 * Reject); its submitter may withdraw it; nobody publishes or rejects
 * directly, which the API refuses.
 */
export const SCHEDULE_ACTIONS: ReadonlyArray<ScheduleAction> = [
	{
		id: "approve",
		labelKey: "approvals.actions.approve",
		primaryWhen: "GENERATED",
		offered: ({ approvalStanding, isLastStep }) =>
			approvalStanding === "mineToDecide" && !isLastStep,
	},
	{
		id: "approveAndPublish",
		labelKey: "approvals.actions.approveAndPublish",
		primaryWhen: "GENERATED",
		offered: ({ approvalStanding, isLastStep }) =>
			approvalStanding === "mineToDecide" && isLastStep,
	},
	{
		id: "publish",
		labelKey: "scheduling.decision.publish",
		primaryWhen: "GENERATED",
		offered: ({ mayPublish, approvalStanding, flowRequired }) =>
			mayPublish && approvalStanding === "none" && !flowRequired,
	},
	{
		id: "submit",
		labelKey: "approvals.actions.submit",
		primaryWhen: "GENERATED",
		offered: ({ mayPublish, approvalStanding, flowRequired }) =>
			mayPublish && approvalStanding === "none" && flowRequired,
	},
	{
		// Rejects directly with no submission waiting, or rejects the step that is the viewer's to decide.
		id: "reject",
		labelKey: "scheduling.decision.reject",
		offered: ({ mayReject, approvalStanding }) =>
			approvalStanding === "mineToDecide" ||
			(mayReject && approvalStanding === "none"),
	},
	{
		id: "withdrawApproval",
		labelKey: "approvals.actions.withdraw",
		offered: ({ approvalStanding }) => approvalStanding === "mineAsSubmitter",
	},
	{
		id: "regenerate",
		labelKey: "scheduling.regenerate.button",
		primaryWhen: "REJECTED",
		offered: ({ mayRegenerate }) => mayRegenerate,
	},
	{
		id: "viewSetup",
		labelKey: "scheduling.detail.viewSetup",
		primaryWhen: "DRAFT",
		offered: () => true,
	},
	{
		id: "details",
		labelKey: "scheduling.detail.details.title",
		offered: ({ hasRoster }) => hasRoster,
	},
];

/** The page's one primary action, if any, and the rest for its menu. */
export const scheduleActions = (
	facts: ScheduleActionFacts
): { primary?: ScheduleAction; menu: Array<ScheduleAction> } => {
	const offered = SCHEDULE_ACTIONS.filter((action) => action.offered(facts));
	const primary = offered.find((action) => action.primaryWhen === facts.status);
	return {
		...(primary ? { primary } : {}),
		menu: offered.filter((action) => action !== primary),
	};
};

const STANDING_OF_ROLE = {
	decider: "mineToDecide",
	submitter: "mineAsSubmitter",
	waiting: "waiting",
} as const satisfies Record<string, ApprovalActionStanding>;

/** The action facts an approval standing gives: whose turn it is, whether it is the last step, whether Publish submits. */
export const approvalActionFacts = (
	standing: ApprovalStanding
): Pick<
	ScheduleActionFacts,
	"approvalStanding" | "isLastStep" | "flowRequired"
> => {
	switch (standing.kind) {
		case "direct":
			return {
				approvalStanding: "none",
				isLastStep: false,
				flowRequired: false,
			};
		case "toSubmit":
			return {
				approvalStanding: "none",
				isLastStep: false,
				flowRequired: true,
			};
		case "unknown":
			return {
				approvalStanding: "unknown",
				isLastStep: false,
				flowRequired: true,
			};
		case "pending":
			return {
				approvalStanding: STANDING_OF_ROLE[standing.role],
				isLastStep: standing.step.isLast,
				flowRequired: true,
			};
	}
};
