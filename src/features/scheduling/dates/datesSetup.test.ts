import { describe, expect, it } from "vitest";
import {
	datesProblemOf,
	maxLastDayOf,
	namedSpansOf,
	planRowOf,
} from "@/features/scheduling/dates/datesSetup";
import {
	datesPlanFixture,
	datesPlanWithKeptWeekFixture,
} from "@/features/scheduling/dates/fixtures";
import type { WeekPart } from "@/features/scheduling/months/api";

const TODAY = "2026-11-17";

describe("maxLastDayOf", () => {
	it("given_aFirstDay_when_asked_then_thirtyDaysLater", () => {
		expect(maxLastDayOf("2026-11-19")).toBe("2026-12-19");
	});
});

describe("datesProblemOf", () => {
	it.each([
		["", "2026-11-28", "missing"],
		["2026-11-16", "2026-11-28", "past"],
		["2026-11-28", "2026-11-19", "reversed"],
		["2026-11-19", "2026-12-20", "tooLong"],
		["2026-11-19", "2026-12-19", undefined],
		["2026-11-17", "2026-11-17", undefined],
	])("given %s to %s_when_checked_then_%s", (first, last, problem) => {
		expect(datesProblemOf(first, last, TODAY)).toBe(problem);
	});
});

describe("planRowOf", () => {
	it("given_aWeekFromThursday_when_laidOut_then_fourNewDaysAndTheRestWithoutARoster", () => {
		const row = planRowOf(datesPlanFixture().weeks[0]!);

		expect(row.days.map((day) => day.covered)).toEqual([
			false,
			false,
			false,
			true,
			true,
			true,
			true,
		]);
		expect(row).toMatchObject({
			badge: "new",
			newDayCount: 4,
			asked: { start: "2026-11-19", end: "2026-11-22" },
			keptState: undefined,
		});
	});

	it("given_aPublishedWeek_when_laidOut_then_keptWithItsStateAndNoNewDay", () => {
		const row = planRowOf(datesPlanWithKeptWeekFixture().weeks[1]!);

		expect(row).toMatchObject({
			badge: "kept",
			newDayCount: 0,
			keptState: "PUBLISHED",
		});
		expect(row.days.every((day) => !day.covered)).toBe(true);
	});
});

describe("namedSpansOf", () => {
	const part = (overrides: Partial<WeekPart>): WeekPart => ({
		scheduleId: "s-1",
		name: "Year-end gala",
		named: true,
		coveredFrom: "2026-11-19",
		coveredTo: "2026-11-22",
		state: "TO_REVIEW",
		...overrides,
	});

	it("given_touchingNamedParts_when_joined_then_oneSpan", () => {
		expect(
			namedSpansOf([
				part({
					named: false,
					name: "Week of 2026-11-16",
					coveredFrom: "2026-11-16",
					coveredTo: "2026-11-18",
				}),
				part({}),
				part({ coveredFrom: "2026-11-23", coveredTo: "2026-11-28" }),
			])
		).toEqual([
			{ name: "Year-end gala", from: "2026-11-19", to: "2026-11-28" },
		]);
	});

	it("given_namedPartsApartOrNamedOtherwise_when_joined_then_separateSpans", () => {
		expect(
			namedSpansOf([
				part({ coveredTo: "2026-11-20" }),
				part({ coveredFrom: "2026-11-23", coveredTo: "2026-11-24" }),
				part({
					name: "Stocktake",
					coveredFrom: "2026-11-25",
					coveredTo: "2026-11-26",
				}),
			])
		).toEqual([
			{ name: "Year-end gala", from: "2026-11-19", to: "2026-11-20" },
			{ name: "Year-end gala", from: "2026-11-23", to: "2026-11-24" },
			{ name: "Stocktake", from: "2026-11-25", to: "2026-11-26" },
		]);
	});
});
