import { describe, expect, it } from "vitest";
import {
	nextMonday,
	thisAndNextMonth,
	thisAndNextWeek,
	thisMonth,
	todayAndTomorrow,
} from "@/features/dashboard/dashboardDates";

/** A Wednesday, near a month's end so "next" crosses into December. */
const WEDNESDAY = new Date(2026, 10, 25, 9, 0);

describe("dashboard dates", () => {
	it("reads this week and next from Monday to the Sunday after", () => {
		expect(thisAndNextWeek(WEDNESDAY)).toEqual({
			from: "2026-11-23",
			to: "2026-12-06",
		});
	});

	it("reads today and tomorrow", () => {
		expect(todayAndTomorrow(WEDNESDAY)).toEqual({
			from: "2026-11-25",
			to: "2026-11-26",
		});
	});

	it("reads this month, and this month and next", () => {
		expect(thisMonth(WEDNESDAY)).toEqual({ from: "2026-11", to: "2026-11" });
		expect(thisAndNextMonth(WEDNESDAY)).toEqual({
			from: "2026-11",
			to: "2026-12",
		});
	});

	it("names next week's Monday as the coming period", () => {
		expect(nextMonday(WEDNESDAY)).toBe("2026-11-30");
	});
});
