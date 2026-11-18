import { describe, expect, it } from "vitest";
import type { PartDays } from "@/features/scheduling/dates/api";
import { handChangesReplacedIn } from "@/features/scheduling/dates/handChanges";

/** A part of the week of 16 Nov 2026 with `handChangedDays`. */
const partWith = (handChangedDays: number | null): PartDays => ({
	scheduleId: "s-1",
	coveredFrom: "2026-11-18",
	coveredTo: "2026-11-19",
	state: "TO_REVIEW",
	handChangedDays,
});

describe("handChangesReplacedIn", () => {
	it.each([
		{
			case: "redone with 2 and rest with 1",
			redone: [partWith(2)],
			rest: [partWith(1)],
			expected: 3,
		},
		{
			case: "parts with no count",
			redone: [partWith(null)],
			rest: [partWith(null)],
			expected: 0,
		},
		{ case: "a week only kept", redone: [], rest: [], expected: 0 },
	])(
		"given_$case_when_counted_then_$expected",
		({ redone, rest, expected }) => {
			expect(handChangesReplacedIn({ redone, rest })).toBe(expected);
		}
	);
});
