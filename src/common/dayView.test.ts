import { describe, expect, it } from "vitest";
import {
	dayColumnClasses,
	dayParameter,
	shownDayOf,
} from "@/common/dayView";

const WEEK = [
	"2026-11-09",
	"2026-11-10",
	"2026-11-11",
	"2026-11-12",
	"2026-11-13",
	"2026-11-14",
	"2026-11-15",
];

describe("shownDayOf", () => {
	it("given_aRequestedDayInTheWeek_when_read_then_showsIt", () => {
		expect(shownDayOf(WEEK, "2026-11-12", "2026-11-10")).toBe("2026-11-12");
	});

	it("given_noRequestedDayAndTodayInTheWeek_when_read_then_showsToday", () => {
		expect(shownDayOf(WEEK, undefined, "2026-11-10")).toBe("2026-11-10");
	});

	it("given_aRequestedDayOutsideTheWeek_when_read_then_fallsBackToToday", () => {
		expect(shownDayOf(WEEK, "2026-11-20", "2026-11-11")).toBe("2026-11-11");
	});

	it("given_todayOutsideTheWeek_when_read_then_showsTheFirstDay", () => {
		expect(shownDayOf(WEEK, undefined, "2026-12-01")).toBe("2026-11-09");
	});

	it("given_noDays_when_read_then_showsNone", () => {
		expect(shownDayOf([], undefined, "2026-11-09")).toBeUndefined();
	});
});

describe("dayParameter", () => {
	it("given_theDefaultDay_when_written_then_leavesItOut", () => {
		expect(dayParameter(WEEK, "2026-11-10", "2026-11-10")).toBeUndefined();
		expect(dayParameter(WEEK, "2026-11-09", "2026-12-01")).toBeUndefined();
	});

	it("given_anotherDay_when_written_then_keepsIt", () => {
		expect(dayParameter(WEEK, "2026-11-12", "2026-11-10")).toBe("2026-11-12");
	});
});

describe("dayColumnClasses", () => {
	it("given_theShownDay_when_styled_then_staysVisible", () => {
		expect(dayColumnClasses("2026-11-10", "2026-11-10")).toBeUndefined();
	});

	it("given_anotherDay_when_styled_then_hidesBelowMd", () => {
		expect(dayColumnClasses("2026-11-11", "2026-11-10")).toBe(
			"hidden md:table-cell"
		);
	});

	it("given_noShownDay_when_styled_then_showsEveryDay", () => {
		expect(dayColumnClasses("2026-11-11", undefined)).toBeUndefined();
	});
});
