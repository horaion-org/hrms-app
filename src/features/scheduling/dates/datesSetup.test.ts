import { describe, expect, it } from "vitest";
import {
	datesIn,
	daysAroundPart,
	daysBeforeOf,
	datesProblemOf,
	maxLastDayOf,
	namedSpansOf,
	planRowOf,
	previousBefore,
	rosterPartBefore,
} from "@/features/scheduling/dates/datesSetup";
import type { PartDays } from "@/features/scheduling/dates/api";
import {
	datesPlanFixture,
	datesPlanRedoingFixture,
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

	it("given_aMonthGeneratedAndWednesdayToThursdayAsked_when_laidOut_then_mondayTuesdayStayWednesdayThursdayRedoneFridayToSundayWeeksOwn", () => {
		const row = planRowOf(datesPlanRedoingFixture().weeks[0]!);

		expect(row.badge).toBe("redo");
		expect(row.lines).toEqual([
			{ kind: "stays", days: { from: "2026-11-16", to: "2026-11-17" } },
			{ kind: "redone", days: { from: "2026-11-18", to: "2026-11-19" } },
			{ kind: "weeksOwn", days: { from: "2026-11-20", to: "2026-11-22" } },
		]);
		expect(row.days.map((day) => day.covered)).toEqual([
			false,
			false,
			true,
			true,
			true,
			true,
			true,
		]);
	});

	it("given_newAndRedoneDaysInOneWeek_when_laidOut_then_oneLineEach", () => {
		const part = (coveredFrom: string, coveredTo: string): PartDays => ({
			scheduleId: "s-2",
			coveredFrom,
			coveredTo,
			state: "TO_REVIEW",
		});
		const [week] = datesPlanFixture().weeks;

		const row = planRowOf({
			...week!,
			askedFrom: "2026-11-16",
			askedTo: "2026-11-21",
			newFrom: "2026-11-16",
			newTo: "2026-11-21",
			redone: [part("2026-11-19", "2026-11-21")],
			rest: [part("2026-11-22", "2026-11-22")],
		});

		expect(row.lines).toEqual([
			{ kind: "new", days: { from: "2026-11-16", to: "2026-11-18" } },
			{ kind: "redone", days: { from: "2026-11-19", to: "2026-11-21" } },
			{ kind: "weeksOwn", days: { from: "2026-11-22", to: "2026-11-22" } },
		]);
		expect(row.days.every((day) => day.covered)).toBe(true);
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
		redoing: false,
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

describe("daysBeforeOf and datesIn", () => {
	it("given_aThursdayStart_when_asked_then_mondayToWednesday", () => {
		const before = daysBeforeOf("2026-11-16", "2026-11-19");

		expect(before).toEqual({ from: "2026-11-16", to: "2026-11-18" });
		expect(datesIn(before!)).toEqual([
			"2026-11-16",
			"2026-11-17",
			"2026-11-18",
		]);
	});

	it("given_aMondayStart_when_asked_then_none", () => {
		expect(daysBeforeOf("2026-11-16", "2026-11-16")).toBeUndefined();
	});
});

describe("rosterPartBefore and previousBefore", () => {
	/** A published part of the week of 9 Nov, the whole week unless `overrides` say. */
	const part = (overrides: Partial<WeekPart> = {}): WeekPart => ({
		scheduleId: "s-1",
		name: "Week of 2026-11-09",
		named: false,
		coveredFrom: "2026-11-09",
		coveredTo: "2026-11-15",
		state: "PUBLISHED",
		redoing: false,
		...overrides,
	});

	it("given_aMondayAfterAWholeRosteredWeek_when_asked_then_carriedFromThatWeek", () => {
		expect(rosterPartBefore("2026-11-16", [part()])).toEqual(part());
		expect(previousBefore("2026-11-16", [part()])).toEqual({
			kind: "carried",
			periodStart: "2026-11-09",
			uncovered: 0,
		});
	});

	it("given_aMondayAfterAWeekRosteredOnlyToWednesday_when_asked_then_none", () => {
		const toWednesday = part({ coveredTo: "2026-11-11" });

		expect(rosterPartBefore("2026-11-16", [toWednesday])).toBeUndefined();
		expect(previousBefore("2026-11-16", [toWednesday])).toEqual({
			kind: "none",
		});
	});

	it("given_aThursdayAfterAPartEndingWednesday_when_asked_then_carriedFromThatPartsDays", () => {
		expect(
			previousBefore("2026-11-12", [part({ coveredTo: "2026-11-11" })])
		).toEqual({
			kind: "carried",
			periodStart: "2026-11-09",
			uncovered: 0,
			days: { from: "2026-11-09", to: "2026-11-11" },
		});
	});

	it("given_onlyADraftOverTheDayBefore_when_asked_then_none", () => {
		expect(rosterPartBefore("2026-11-16", [part({ state: "DRAFT" })])).toBe(
			undefined
		);
	});

	it("given_noParts_when_asked_then_none", () => {
		expect(previousBefore("2026-11-16", [])).toEqual({ kind: "none" });
	});
});

describe("daysAroundPart", () => {
	const WEEK = { periodStart: "2026-10-12", periodEnd: "2026-10-18" };

	it("given_aPartEndingSaturday_when_asked_then_sundayIsFree", () => {
		expect(
			daysAroundPart(
				{ ...WEEK, coveredFrom: "2026-10-12", coveredTo: "2026-10-17" },
				[]
			)
		).toEqual({
			before: undefined,
			after: { from: "2026-10-18", to: "2026-10-18" },
			afterTaken: false,
		});
	});

	it("given_aRedoPartInsideAWiderPart_when_asked_then_daysAfterAreTaken", () => {
		const wholeWeek: WeekPart = {
			scheduleId: "s-1",
			name: "Week of 2026-10-12",
			named: false,
			coveredFrom: "2026-10-12",
			coveredTo: "2026-10-18",
			state: "TO_REVIEW",
			redoing: false,
		};
		const redo: WeekPart = {
			...wholeWeek,
			scheduleId: "s-2",
			coveredFrom: "2026-10-14",
			coveredTo: "2026-10-15",
			state: "GENERATING",
			redoing: true,
		};

		expect(daysAroundPart({ ...WEEK, ...redo }, [wholeWeek, redo])).toEqual({
			before: { from: "2026-10-12", to: "2026-10-13" },
			after: { from: "2026-10-16", to: "2026-10-18" },
			afterTaken: true,
		});
	});

	it("given_aLaterPartFromThursday_when_asked_then_mondayToWednesdayBefore", () => {
		expect(
			daysAroundPart(
				{ ...WEEK, coveredFrom: "2026-10-15", coveredTo: "2026-10-18" },
				[]
			)
		).toEqual({
			before: { from: "2026-10-12", to: "2026-10-14" },
			after: undefined,
			afterTaken: false,
		});
	});
});
