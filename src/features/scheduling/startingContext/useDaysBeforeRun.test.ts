import { describe, expect, it } from "vitest";
import type { DayBeforeRun } from "@/features/scheduling/startingContext/daysBeforeRun";
import { daysBeforeStateOf } from "@/features/scheduling/startingContext/useDaysBeforeRun";

const DAY: DayBeforeRun = {
	memberProfileId: "p-tan",
	date: "2026-11-08",
	what: { kind: "leave" },
	enteredByHand: false,
};

describe("daysBeforeStateOf", () => {
	it.each([
		[
			"while the read is under way",
			{ isLoading: true, data: undefined },
			{ status: "pending" },
		],
		[
			"once read",
			{ isLoading: false, data: [DAY] },
			{ status: "ready", days: [DAY] },
		],
		[
			"once read with nothing known",
			{ isLoading: false, data: [] },
			{ status: "ready", days: [] },
		],
		// Never asked for (no permission), or failed: the roster is as it was.
		[
			"when there is no answer",
			{ isLoading: false, data: undefined },
			undefined,
		],
	])("gives %s", (_name, query, expected) => {
		expect(daysBeforeStateOf(query)).toEqual(expected);
	});
});
