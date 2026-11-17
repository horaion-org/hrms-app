import { describe, expect, it } from "vitest";
import {
	datesPlanFixture,
	datesPlanRedoingFixture,
} from "@/features/scheduling/dates/fixtures";
import type { WeekPart } from "@/features/scheduling/months/api";
import {
	monthWeekFixture,
	ungeneratedMonthFixture,
} from "@/features/scheduling/months/fixtures";
import {
	partsBeforeStartOf,
	runStartOf,
} from "@/features/scheduling/months/runStart";

/** December's first week, 7 – 13 Dec, not generated yet. */
const FIRST_DECEMBER_WEEK = ungeneratedMonthFixture().weeks[0]!;

describe("runStartOf, a month run", () => {
	it("given_aStartingWeekNotBegunYet_when_started_then_fromItsMondayWithNoDaysBefore", () => {
		expect(
			runStartOf({
				byDates: false,
				plan: undefined,
				startingWeek: FIRST_DECEMBER_WEEK,
				branchToday: "2026-12-07",
			})
		).toEqual({
			datesStart: undefined,
			startedWeekFrom: undefined,
			firstGeneratedDay: "2026-12-07",
			daysBeforeStart: undefined,
			firstMonday: "2026-12-07",
			weekBefore: "2026-11-30",
			datesStartOnMonday: false,
			datesRedoStart: false,
		});
	});

	it("given_aStartingWeekThatBeganOnMonday_when_startedOnWednesday_then_fromTodayAskingAboutMondayAndTuesday", () => {
		expect(
			runStartOf({
				byDates: false,
				plan: undefined,
				startingWeek: FIRST_DECEMBER_WEEK,
				branchToday: "2026-12-09",
			})
		).toEqual({
			datesStart: undefined,
			startedWeekFrom: "2026-12-09",
			firstGeneratedDay: "2026-12-09",
			daysBeforeStart: { from: "2026-12-07", to: "2026-12-08" },
			firstMonday: "2026-12-07",
			weekBefore: "2026-11-30",
			datesStartOnMonday: false,
			datesRedoStart: false,
		});
	});

	it("given_noStartingWeek_when_started_then_nothingToStartFrom", () => {
		expect(
			runStartOf({
				byDates: false,
				plan: datesPlanFixture(),
				startingWeek: undefined,
				branchToday: "2026-12-07",
			})
		).toEqual({
			datesStart: datesPlanFixture().weeks[0],
			startedWeekFrom: undefined,
			firstGeneratedDay: undefined,
			daysBeforeStart: undefined,
			firstMonday: undefined,
			weekBefore: undefined,
			datesStartOnMonday: false,
			datesRedoStart: false,
		});
	});
});

describe("runStartOf, a dates run", () => {
	it("given_datesFromThursday_when_started_then_fromTheFirstNewDayWithThePlansDaysBefore", () => {
		const plan = datesPlanFixture();

		expect(
			runStartOf({
				byDates: true,
				plan,
				startingWeek: undefined,
				branchToday: "2026-11-17",
			})
		).toEqual({
			datesStart: plan.weeks[0],
			startedWeekFrom: undefined,
			firstGeneratedDay: "2026-11-19",
			daysBeforeStart: { from: "2026-11-16", to: "2026-11-18" },
			firstMonday: "2026-11-16",
			weekBefore: "2026-11-09",
			datesStartOnMonday: false,
			datesRedoStart: false,
		});
	});

	it("given_aFirstWeekKeptWhole_when_started_then_theNextWeeksMondayAndTheWeekBeforeIsRead", () => {
		const plan = datesPlanFixture();
		const [kept, next] = plan.weeks;
		const startsOnMonday = {
			...plan,
			weeks: [
				{ ...kept!, newFrom: null, newTo: null, action: "KEEP" as const },
				next!,
			],
			notRosteredBefore: null,
		};

		expect(
			runStartOf({
				byDates: true,
				plan: startsOnMonday,
				startingWeek: undefined,
				branchToday: "2026-11-17",
			})
		).toMatchObject({
			datesStart: next,
			firstGeneratedDay: "2026-11-23",
			daysBeforeStart: undefined,
			firstMonday: "2026-11-23",
			weekBefore: "2026-11-16",
			datesStartOnMonday: true,
			datesRedoStart: false,
		});
	});

	it("given_datesWhoseFirstNewDaysHaveASchedule_when_started_then_theyAreRedone", () => {
		expect(
			runStartOf({
				byDates: true,
				plan: datesPlanRedoingFixture(),
				startingWeek: undefined,
				branchToday: "2026-11-17",
			})
		).toMatchObject({
			firstGeneratedDay: "2026-11-18",
			daysBeforeStart: undefined,
			firstMonday: "2026-11-16",
			datesStartOnMonday: false,
			datesRedoStart: true,
		});
	});

	it("given_noPlanYetButAStartedMonthWeek_when_started_then_theMonthsWeekIsNotTheStart", () => {
		expect(
			runStartOf({
				byDates: true,
				plan: undefined,
				startingWeek: FIRST_DECEMBER_WEEK,
				branchToday: "2026-12-09",
			})
		).toEqual({
			datesStart: undefined,
			// Worked out from the month's week either way; a dates run never reads it.
			startedWeekFrom: "2026-12-09",
			firstGeneratedDay: undefined,
			daysBeforeStart: undefined,
			firstMonday: undefined,
			weekBefore: undefined,
			datesStartOnMonday: false,
			datesRedoStart: false,
		});
	});
});

describe("partsBeforeStartOf", () => {
	/** A whole week's roster part, s-<monday>, published. */
	const partOf = (monday: string, sunday: string): WeekPart => ({
		scheduleId: `s-${monday}`,
		name: `Week of ${monday}`,
		named: false,
		coveredFrom: monday,
		coveredTo: sunday,
		state: "PUBLISHED",
		redoing: false,
	});

	it("given_keptPartsAndBothMonths_when_gathered_then_keptFirstThenTheMonthBeforeThenTheMonth", () => {
		const kept = datesPlanRedoingFixture().weeks[0]!;
		const november = ungeneratedMonthFixture({
			month: "2026-11",
			weeks: [
				monthWeekFixture({
					periodStart: "2026-11-30",
					parts: [partOf("2026-11-30", "2026-12-06")],
				}),
			],
		});
		const december = ungeneratedMonthFixture({
			weeks: [
				monthWeekFixture({
					periodStart: "2026-12-07",
					parts: [partOf("2026-12-07", "2026-12-13")],
				}),
			],
		});

		expect(
			partsBeforeStartOf(kept, november, december).map(
				(part) => part.coveredFrom
			)
		).toEqual(["2026-11-16", "2026-11-30", "2026-12-07"]);
	});

	it("given_nothingRead_when_gathered_then_noParts", () => {
		expect(partsBeforeStartOf(undefined, undefined, undefined)).toEqual([]);
	});
});
