import { describe, expect, it } from "vitest";
import {
	isWeekdays,
	paidShiftHours,
	shiftHours,
} from "@/features/scheduling/shifts/shiftHours";

describe("shift calculations", () => {
	it.each([
		["09:00", "15:00", 6],
		["11:00", "13:00", 2],
		["16:00", "00:00", 8],
		["23:00", "07:00", 8],
		["06:00", "06:00", 24],
	])(
		"given_%s_to_%s_when_measured_then_lasts_%i_hours",
		(startTime, endTime, hours) => {
			expect(shiftHours({ startTime, endTime })).toBe(hours);
		}
	);

	it.each([
		["a shift with no break", "09:00", "15:00", 0, 6],
		["a 12-hour shift with a 1-hour break", "07:00", "19:00", 60, 11],
		["a night shift with a break", "19:00", "07:00", 45, 11.25],
		["a break that does not divide evenly", "09:00", "15:00", 20, 5.67],
	])(
		"given_%s_when_measured_then_paysItsLengthLessTheBreak",
		(_, startTime, endTime, unpaidBreakMinutes, hours) => {
			expect(paidShiftHours({ startTime, endTime, unpaidBreakMinutes })).toBe(
				hours
			);
		}
	);

	it("given_days_when_checked_then_onlyMondayToFridayCountsAsWeekdays", () => {
		expect(isWeekdays(["MON", "TUE", "WED", "THU", "FRI"])).toBe(true);
		expect(isWeekdays(["MON", "TUE", "WED", "THU", "SAT"])).toBe(false);
		expect(isWeekdays(["MON", "TUE", "WED", "THU", "FRI", "SAT"])).toBe(false);
	});
});
