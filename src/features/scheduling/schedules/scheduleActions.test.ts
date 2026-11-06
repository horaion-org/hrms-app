import { describe, expect, it } from "vitest";
import {
	scheduleActions,
	type ScheduleActionFacts,
	type ScheduleActionId,
} from "./scheduleActions";

const NOTHING: ScheduleActionFacts = {
	status: "GENERATED",
	mayPublish: false,
	mayReject: false,
	mayRegenerate: false,
	hasRoster: true,
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
