import { describe, expect, it } from "vitest";
import { shiftGroupSummaryOf } from "@/features/scheduling/shifts/shiftGroups";

/** A shift with only what the summary reads; `warns` marks one whose Needed column warns. */
const shift = (
	shiftId: string,
	startTime: string,
	endTime: string,
	warns = false
): { shiftId: string; startTime: string; endTime: string; warns: boolean } => ({
	shiftId,
	startTime,
	endTime,
	warns,
});

const warns = (each: { warns: boolean }): boolean => each.warns;

describe("shiftGroupSummaryOf", () => {
	it("given_dayShifts_when_summarised_then_spansFirstStartToLatestEnd", () => {
		expect(
			shiftGroupSummaryOf(
				[shift("a", "07:00", "15:00"), shift("b", "09:00", "13:00")],
				[],
				warns
			)
		).toEqual({
			count: 2,
			startTime: "07:00",
			endTime: "15:00",
			chosen: 0,
			warns: false,
		});
	});

	it("given_aNightGroup_when_summarised_then_itsEndIsPastMidnight", () => {
		const summary = shiftGroupSummaryOf(
			[
				shift("a", "21:00", "05:00"),
				shift("b", "23:00", "07:00"),
				shift("c", "22:00", "23:30"),
			],
			[],
			warns
		);

		expect(summary?.startTime).toBe("21:00");
		expect(summary?.endTime).toBe("07:00");
	});

	it("given_tickedAndWarningShifts_when_summarised_then_countsTheTickedAndWarns", () => {
		const summary = shiftGroupSummaryOf(
			[
				shift("a", "07:00", "15:00"),
				shift("b", "15:00", "23:00", true),
				shift("c", "23:00", "07:00"),
			],
			["a", "c", "elsewhere"],
			warns
		);

		expect(summary?.chosen).toBe(2);
		expect(summary?.warns).toBe(true);
	});

	it("given_noShifts_when_summarised_then_none", () => {
		expect(shiftGroupSummaryOf([], [], warns)).toBeUndefined();
	});
});
