import { describe, expect, it } from "vitest";
import { leavesLittleOfADay } from "@/features/leaveDurations/LeaveDurationDialog/leftOfADay";

describe("leavesLittleOfADay", () => {
	it.each([
		[4 * 60, false],
		[6 * 60, false],
		[6 * 60 + 1, true],
		[8 * 60, true],
		[10 * 60, true],
	])("given_%s_minutes_of_leave_when_judged_then_%s", (minutes, little) => {
		expect(leavesLittleOfADay(minutes)).toBe(little);
	});
});
