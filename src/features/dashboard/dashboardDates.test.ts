import { describe, expect, it } from "vitest";
import {
	comingPeopleDays,
	comingTwoWeeks,
	lastAndThisMonth,
	monthDays,
	pastTwoWeeks,
	nextMonday,
	thisAndNextMonth,
	thisAndNextWeek,
	todayOnly,
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

	it("reads thirty days of people events from today", () => {
		expect(comingPeopleDays(WEDNESDAY)).toEqual({
			from: "2026-11-25",
			to: "2026-12-24",
		});
	});

	it("reads today alone", () => {
		expect(todayOnly(WEDNESDAY)).toEqual({
			from: "2026-11-25",
			to: "2026-11-25",
		});
	});

	it("reads this month and next", () => {
		expect(thisAndNextMonth(WEDNESDAY)).toEqual({
			from: "2026-11",
			to: "2026-12",
		});
	});

	it("looks fourteen days ahead and compares with the fourteen before", () => {
		expect(comingTwoWeeks(WEDNESDAY)).toEqual({
			from: "2026-11-25",
			to: "2026-12-08",
		});
		expect(pastTwoWeeks(WEDNESDAY)).toEqual({
			from: "2026-11-11",
			to: "2026-11-24",
		});
	});

	it("reads this month and last, as days and as months", () => {
		expect(monthDays(WEDNESDAY)).toEqual({
			from: "2026-11-01",
			to: "2026-11-30",
		});
		expect(monthDays(WEDNESDAY, 1)).toEqual({
			from: "2026-10-01",
			to: "2026-10-31",
		});
		expect(lastAndThisMonth(WEDNESDAY)).toEqual({
			from: "2026-10",
			to: "2026-11",
		});
	});

	it("names next week's Monday as the coming period", () => {
		expect(nextMonday(WEDNESDAY)).toBe("2026-11-30");
	});
});
