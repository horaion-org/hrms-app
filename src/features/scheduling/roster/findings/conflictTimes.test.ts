import { describe, expect, it } from "vitest";
import { conflictClockTimes } from "@/features/scheduling/roster/findings/conflictTimes";

describe("conflictClockTimes", () => {
	it.each([
		["2026-10-17T09:00:00", "2026-10-17T15:00:00", "09:00", "15:00"],
		[
			"2026-10-17T22:30:00+08:00",
			"2026-10-18T02:00:00+08:00",
			"22:30",
			"02:00",
		],
		["09:00", "15:00", "09:00", "15:00"],
	])(
		"given_aSpanFrom_%s_to_%s_when_read_then_isItsClockTimes",
		(start, end, startTime, endTime) => {
			expect(conflictClockTimes({ start, end })).toEqual({
				startTime,
				endTime,
			});
		}
	);
});
