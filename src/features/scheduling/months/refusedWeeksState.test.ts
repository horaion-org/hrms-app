import { describe, expect, it } from "vitest";
import {
	refusedWeeksFrom,
	withRefusedWeeks,
} from "@/features/scheduling/months/refusedWeeksState";

describe("refused weeks in history state", () => {
	it("given_refusedWeeks_when_carriedAndRead_then_theSameWeeksComeBack", () => {
		const state = withRefusedWeeks({
			"2026-12-07": "SCHEDULE_HAS_NO_EMPLOYEES",
		})({});

		expect(refusedWeeksFrom(state)).toEqual({
			"2026-12-07": "SCHEDULE_HAS_NO_EMPLOYEES",
		});
	});

	it("given_anythingElse_when_read_then_none", () => {
		expect(refusedWeeksFrom(undefined)).toEqual({});
		expect(refusedWeeksFrom({ refusedWeeks: "x" })).toEqual({});
	});
});
