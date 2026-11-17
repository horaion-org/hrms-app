import { describe, expect, it } from "vitest";
import {
	stretchedTimes,
	stretchMinutes,
	stretchSpans,
} from "@/features/scheduling/roster/shiftStretch";

const MORNING = { start: "06:00", end: "14:00" };

describe("a stretched day's times", () => {
	it("keeps the shift's own times with no stretch", () => {
		expect(stretchedTimes(MORNING, null)).toEqual(MORNING);
		expect(stretchedTimes(MORNING, undefined)).toEqual(MORNING);
		expect(stretchMinutes(null)).toBe(0);
	});

	it("widens the shift by the minutes before and after it", () => {
		const stretch = { beforeMinutes: 60, afterMinutes: 120 };

		expect(stretchedTimes(MORNING, stretch)).toEqual({
			start: "05:00",
			end: "16:00",
		});
		expect(stretchMinutes(stretch)).toBe(180);
	});

	it("wraps a stretch across midnight on either side", () => {
		expect(
			stretchedTimes(
				{ start: "00:30", end: "08:30" },
				{ beforeMinutes: 60, afterMinutes: 0 }
			)
		).toEqual({ start: "23:30", end: "08:30" });
		expect(
			stretchedTimes(
				{ start: "16:00", end: "23:00" },
				{ beforeMinutes: 0, afterMinutes: 120 }
			)
		).toEqual({ start: "16:00", end: "01:00" });
	});
});

describe("a stretch's own times", () => {
	it("gives none with no stretch", () => {
		expect(stretchSpans(MORNING, null)).toEqual([]);
		expect(
			stretchSpans(MORNING, { beforeMinutes: 0, afterMinutes: 0 })
		).toEqual([]);
	});

	it("gives the time before the shift, then the time after it", () => {
		expect(
			stretchSpans(MORNING, { beforeMinutes: 60, afterMinutes: 120 })
		).toEqual([
			{ start: "05:00", end: "06:00" },
			{ start: "14:00", end: "16:00" },
		]);
	});

	it("runs a span past midnight on either side", () => {
		expect(
			stretchSpans(
				{ start: "00:30", end: "08:30" },
				{ beforeMinutes: 60, afterMinutes: 0 }
			)
		).toEqual([{ start: "23:30", end: "00:30" }]);
		expect(
			stretchSpans(
				{ start: "21:00", end: "23:00" },
				{ beforeMinutes: 0, afterMinutes: 120 }
			)
		).toEqual([{ start: "23:00", end: "01:00" }]);
	});
});
