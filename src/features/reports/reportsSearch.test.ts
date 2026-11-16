import { describe, expect, it } from "vitest";
import {
	defaultRange,
	monthsOf,
	parseReportsSearch,
	presetOf,
	presetRange,
	rangeOf,
	rangeProblemOf,
} from "@/features/reports/reportsSearch";

const TODAY = new Date(2026, 10, 16, 9, 0);

describe("reports search", () => {
	it("keeps the units and range it recognises and drops the rest", () => {
		expect(
			parseReportsSearch({
				branch: "b-1",
				from: "2026-11-01",
				to: "not a date",
				other: "x",
			})
		).toEqual({ branch: "b-1", from: "2026-11-01" });
	});

	it("reads this month until both ends are chosen", () => {
		expect(defaultRange(TODAY)).toEqual({
			from: "2026-11-01",
			to: "2026-11-30",
		});
		expect(rangeOf({ from: "2026-10-01" }, TODAY)).toEqual(defaultRange(TODAY));
		expect(rangeOf({ from: "2026-10-01", to: "2026-10-31" }, TODAY)).toEqual({
			from: "2026-10-01",
			to: "2026-10-31",
		});
	});

	it("names a range the API would refuse", () => {
		expect(rangeProblemOf({ from: "2026-11-02", to: "2026-11-01" })).toBe(
			"inverted"
		);
		expect(rangeProblemOf({ from: "2026-01-01", to: "2026-04-03" })).toBe(
			"tooLong"
		);
		expect(
			rangeProblemOf({ from: "2026-01-01", to: "2026-04-02" })
		).toBeUndefined();
	});

	it("gives each preset its whole months, which the API always reads", () => {
		expect(presetRange("thisMonth", TODAY)).toEqual({
			from: "2026-11-01",
			to: "2026-11-30",
		});
		expect(presetRange("lastMonth", TODAY)).toEqual({
			from: "2026-10-01",
			to: "2026-10-31",
		});
		const threeMonths = presetRange("lastThreeMonths", TODAY);
		expect(threeMonths).toEqual({ from: "2026-09-01", to: "2026-11-30" });
		expect(rangeProblemOf(threeMonths)).toBeUndefined();
	});

	it("names the preset a range matches, else custom", () => {
		expect(presetOf({ from: "2026-10-01", to: "2026-10-31" }, TODAY)).toBe(
			"lastMonth"
		);
		expect(presetOf({ from: "2026-10-02", to: "2026-10-31" }, TODAY)).toBe(
			"custom"
		);
	});

	it("names the months a range touches", () => {
		expect(monthsOf({ from: "2026-10-20", to: "2026-12-05" })).toEqual({
			from: "2026-10",
			to: "2026-12",
		});
	});
});
