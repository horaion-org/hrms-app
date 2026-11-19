import { describe, expect, it } from "vitest";
import {
	offersPublishing,
	type PieceFacts,
	type PieceMenuItem,
	pieceMenuOf,
} from "@/features/scheduling/timeline/pieceActions";

/** A generated roster nobody may act on, with no approval flow. */
const NOTHING: PieceFacts = {
	status: "GENERATED",
	mayPublish: false,
	mayReject: false,
	mayWithdraw: false,
	mayRegenerate: false,
	regeneratesPart: false,
	hasRoster: true,
	approvalStanding: "none",
	isLastStep: false,
	flowRequired: false,
	mayDelete: false,
};

/** A manager's facts on a roster to review: may publish, reject, generate again and delete. */
const MANAGER = {
	mayPublish: true,
	mayReject: true,
	mayRegenerate: true,
	mayDelete: true,
};

describe("pieceMenuOf", () => {
	/** The roster page's own rule decides each item; Reject, View setup and Details never reach the strip. */
	it.each<[string, Partial<PieceFacts>, Array<PieceMenuItem>]>([
		[
			"to review, no flow",
			MANAGER,
			["open", "publish", "regenerate", "delete"],
		],
		[
			"to review, a flow applies",
			{ ...MANAGER, flowRequired: true },
			["open", "submit", "regenerate", "delete"],
		],
		[
			"to review, the approval still loading",
			{ ...MANAGER, approvalStanding: "unknown", flowRequired: true },
			["open", "regenerate", "delete"],
		],
		[
			"to review, a middle step theirs to decide",
			{ ...MANAGER, approvalStanding: "mineToDecide", flowRequired: true },
			["open", "approve", "regenerate", "delete"],
		],
		[
			"to review, the last step theirs to decide",
			{
				...MANAGER,
				approvalStanding: "mineToDecide",
				isLastStep: true,
				flowRequired: true,
			},
			["open", "approveAndPublish", "regenerate", "delete"],
		],
		[
			"to review, a part of its week",
			{ ...MANAGER, regeneratesPart: true },
			["open", "publish", "regenerate", "delete"],
		],
		[
			"published",
			{ status: "PUBLISHED", mayWithdraw: true },
			["open", "withdraw"],
		],
		[
			"generating",
			{ status: "GENERATION_REQUESTED", hasRoster: false, mayDelete: true },
			["open", "delete"],
		],
		[
			"failed",
			{
				status: "GENERATION_FAILED",
				hasRoster: false,
				mayRegenerate: true,
				mayDelete: true,
			},
			["open", "regenerate", "delete"],
		],
		[
			"rejected",
			{ status: "REJECTED", mayRegenerate: true, mayDelete: true },
			["open", "regenerate", "delete"],
		],
		[
			"a draft",
			{ status: "DRAFT", hasRoster: false, mayDelete: true },
			["setup", "delete"],
		],
		[
			"to review, without schedule:publish",
			{ mayRegenerate: true, mayDelete: true },
			["open", "regenerate", "delete"],
		],
		["published, without schedule:publish", { status: "PUBLISHED" }, ["open"]],
		["to review, for a reader", {}, ["open"]],
	])("%s offers %j", (_, facts, expected) => {
		expect(pieceMenuOf({ ...NOTHING, ...facts })).toEqual(expected);
	});
});

describe("offersPublishing", () => {
	/** Publish outside the menu follows the menu: offered only where one of its items puts the roster forward. */
	it.each<[Array<PieceMenuItem>, boolean]>([
		[["open", "publish", "regenerate", "delete"], true],
		[["open", "submit"], true],
		[["open", "approve"], true],
		[["open", "approveAndPublish"], true],
		[["open", "regenerate", "delete"], false],
		[["open", "withdraw"], false],
		[["setup", "delete"], false],
	])("a menu of %j offers publishing: %s", (menu, expected) => {
		expect(offersPublishing(menu)).toBe(expected);
	});
});
