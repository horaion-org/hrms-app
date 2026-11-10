import { expect, it } from "vitest";
import { movedFocusTarget } from "@/features/approvals/ApprovalFlowDialog/movedFocusTarget";

it.each([
	{ index: 1, direction: "up", lastIndex: 2, kept: "up" },
	{ index: 1, direction: "down", lastIndex: 2, kept: "down" },
	{ index: 0, direction: "up", lastIndex: 2, kept: "down" },
	{ index: 2, direction: "down", lastIndex: 2, kept: "up" },
	{ index: 0, direction: "down", lastIndex: 2, kept: "down" },
	{ index: 2, direction: "up", lastIndex: 2, kept: "up" },
] as const)(
	"a step moved $direction to $index of 0..$lastIndex keeps focus on $kept",
	({ index, direction, lastIndex, kept }) => {
		expect(movedFocusTarget(index, direction, lastIndex)).toBe(kept);
	}
);
