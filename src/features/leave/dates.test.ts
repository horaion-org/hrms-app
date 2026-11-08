import { expect, it } from "vitest";
import { calendarDayOf, rangeDays, shiftRange } from "@/features/leave/dates";

it("navigates inclusive periods across a year boundary without gaps", () => {
	const range = { start: "2026-12-20", end: "2027-01-02" };
	expect(rangeDays(range)).toHaveLength(14);
	const next = shiftRange(range, 1);
	expect(next).toEqual({ start: "2027-01-03", end: "2027-01-16" });
	expect(shiftRange(next, -1)).toEqual(range);
});

it.each([
	["2026-11-08T23:30:00Z", "Asia/Singapore", "2026-11-09"],
	["2026-11-08T23:30:00Z", "UTC", "2026-11-08"],
	["2026-11-09T07:30:00+08:00", "Asia/Singapore", "2026-11-09"],
	["2026-11-09T03:00:00Z", "America/New_York", "2026-11-08"],
])("puts %s on its %s calendar day, %s", (instant, timeZone, day) => {
	expect(calendarDayOf(instant, timeZone)).toBe(day);
});
