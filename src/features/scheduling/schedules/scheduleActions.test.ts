import { describe, expect, it } from "vitest";
import {
	approvalActionFacts,
	scheduleActions,
	type ScheduleActionFacts,
	type ScheduleActionId,
} from "./scheduleActions";

const NOTHING: ScheduleActionFacts = {
	status: "GENERATED",
	mayPublish: false,
	mayReject: false,
	mayWithdraw: false,
	mayRegenerate: false,
	hasRoster: true,
	approvalStanding: "none",
	isLastStep: false,
	flowRequired: false,
};

const ALL = { mayPublish: true, mayReject: true, mayRegenerate: true };

describe("scheduleActions", () => {
	it.each<
		[
			string,
			Partial<ScheduleActionFacts>,
			ScheduleActionId | undefined,
			Array<ScheduleActionId>,
		]
	>([
		["a reader of a generated roster", {}, undefined, ["viewSetup", "details"]],
		[
			"a decider of a generated roster",
			{ ...ALL },
			"publish",
			["reject", "regenerate", "viewSetup", "details"],
		],
		[
			"a decider when the week is published elsewhere",
			{ mayReject: true },
			undefined,
			["reject", "viewSetup", "details"],
		],
		[
			"a regenerator of a rejected roster",
			{ status: "REJECTED", mayRegenerate: true },
			"regenerate",
			["viewSetup", "details"],
		],
		[
			"anyone on a published roster",
			{ status: "PUBLISHED" },
			undefined,
			["viewSetup", "details"],
		],
		[
			"a decider where a flow applies and nothing is submitted",
			{ ...ALL, flowRequired: true },
			"submit",
			["reject", "regenerate", "viewSetup", "details"],
		],
		[
			"the approver of a middle step",
			{ ...ALL, flowRequired: true, approvalStanding: "mineToDecide" },
			"approve",
			["reject", "regenerate", "viewSetup", "details"],
		],
		[
			"the approver of the last step",
			{
				...ALL,
				flowRequired: true,
				approvalStanding: "mineToDecide",
				isLastStep: true,
			},
			"approveAndPublish",
			["reject", "regenerate", "viewSetup", "details"],
		],
		[
			"an approver whose key is held elsewhere (canDecide alone)",
			{ approvalStanding: "mineToDecide" },
			"approve",
			["reject", "viewSetup", "details"],
		],
		[
			"the submitter while it waits",
			{ ...ALL, flowRequired: true, approvalStanding: "mineAsSubmitter" },
			undefined,
			["withdrawApproval", "regenerate", "viewSetup", "details"],
		],
		[
			"a decider while it waits on someone else",
			{ ...ALL, flowRequired: true, approvalStanding: "waiting" },
			undefined,
			["regenerate", "viewSetup", "details"],
		],
		[
			"a decider while the approval is still unknown",
			{ ...ALL, flowRequired: true, approvalStanding: "unknown" },
			undefined,
			["regenerate", "viewSetup", "details"],
		],
		[
			"a decider of a published roster",
			{ status: "PUBLISHED", mayWithdraw: true },
			undefined,
			["withdraw", "viewSetup", "details"],
		],
		[
			"anyone on a draft",
			{ status: "DRAFT", hasRoster: false },
			"viewSetup",
			[],
		],
	])(
		"offers %s its one primary action and the rest in the menu",
		(_, facts, primary, menu) => {
			const actions = scheduleActions({ ...NOTHING, ...facts });

			expect(actions.primary?.id).toBe(primary);
			expect(actions.menu.map((action) => action.id)).toEqual(menu);
		}
	);
});

describe("approvalActionFacts", () => {
	const step = { order: 2, count: 2, label: "Publish", isLast: true };

	it.each([
		[
			{ kind: "direct" } as const,
			{ approvalStanding: "none", isLastStep: false, flowRequired: false },
		],
		[
			{ kind: "toSubmit", stepLabels: ["Endorse"] } as const,
			{ approvalStanding: "none", isLastStep: false, flowRequired: true },
		],
		[
			{ kind: "unknown", failed: false } as const,
			{ approvalStanding: "unknown", isLastStep: false, flowRequired: true },
		],
		[
			{ kind: "pending", role: "decider", step } as const,
			{
				approvalStanding: "mineToDecide",
				isLastStep: true,
				flowRequired: true,
			},
		],
		[
			{ kind: "pending", role: "submitter", step } as const,
			{
				approvalStanding: "mineAsSubmitter",
				isLastStep: true,
				flowRequired: true,
			},
		],
		[
			{ kind: "pending", role: "waiting", step } as const,
			{ approvalStanding: "waiting", isLastStep: true, flowRequired: true },
		],
	])("maps %o", (standing, facts) => {
		expect(approvalActionFacts(standing)).toEqual(facts);
	});
});
