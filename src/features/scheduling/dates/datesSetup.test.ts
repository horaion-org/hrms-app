import { describe, expect, it } from "vitest";
import {
	datesGenerationBody,
	datesIn,
	daysBeforeOf,
	datesProblemOf,
	maxLastDayOf,
	namedSpansOf,
	partRedoOf,
	planNotesOf,
	planRowOf,
	previousBefore,
	rosterPartBefore,
	weekRunsAround,
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
			asked: { start: "2026-11-19", end: "2026-11-22" },
			lines: [{ kind: "new", days: { from: "2026-11-19", to: "2026-11-22" } }],
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
			lines: [
				{ kind: "stays", days: { from: "2026-11-23", to: "2026-11-29" } },
			],
		});
		expect(row.days.every((day) => !day.covered)).toBe(true);
	});
});

describe("planNotesOf", () => {
	it("given_aPublishedWeek_when_noted_then_itsAskedDaysArePublishedAndNothingReplaced", () => {
		expect(planNotesOf(datesPlanWithKeptWeekFixture())).toEqual({
			publishedDays: [{ from: "2026-11-23", to: "2026-11-28" }],
			redoneDays: [],
			restOnlyDays: [],
			restDayCount: 0,
		});
	});

	it("given_theOwnersExample_when_noted_then_wednesdayThursdayReplacedAndThreeRestDays", () => {
		expect(planNotesOf(datesPlanRedoingFixture())).toEqual({
			publishedDays: [],
			redoneDays: [{ from: "2026-11-18", to: "2026-11-19" }],
			restOnlyDays: [],
			restDayCount: 3,
		});
	});

	it("given_newDaysBeforeALaterPart_when_noted_then_onlyItsRestIsScheduledAgain", () => {
		const plan = datesPlanFixture();
		const week = {
			...plan.weeks[0]!,
			askedFrom: "2026-11-16",
			askedTo: "2026-11-18",
			newFrom: "2026-11-16",
			newTo: "2026-11-18",
			rest: [
				{
					scheduleId: "s-2",
					coveredFrom: "2026-11-19",
					coveredTo: "2026-11-22",
					state: "TO_REVIEW" as const,
				},
			],
		};

		expect(planNotesOf({ ...plan, weeks: [week] })).toEqual({
			publishedDays: [],
			redoneDays: [],
			restOnlyDays: [{ from: "2026-11-19", to: "2026-11-22" }],
			restDayCount: 4,
		});
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

describe("partRedoOf", () => {
	const wholeWeek: WeekPart = {
		scheduleId: "s-1",
		name: "Week of 2026-11-16",
		named: false,
		coveredFrom: "2026-11-16",
		coveredTo: "2026-11-22",
		state: "TO_REVIEW",
		redoing: false,
	};
	const redo: WeekPart = {
		...wholeWeek,
		scheduleId: "s-2",
		coveredFrom: "2026-11-18",
		coveredTo: "2026-11-19",
		state: "GENERATING",
		redoing: true,
	};
	const WEDNESDAY_TO_THURSDAY = { from: "2026-11-18", to: "2026-11-19" };

	it("given_aRedoPart_when_asked_then_itRedoesItsOwnDays", () => {
		expect(partRedoOf(redo, [wholeWeek, redo])).toEqual({
			kind: "redoing",
			days: WEDNESDAY_TO_THURSDAY,
		});
	});

	it("given_aPartARedoOverlaps_when_asked_then_theRedoPartsDaysAreBeingRedone", () => {
		expect(partRedoOf(wholeWeek, [wholeWeek, redo])).toEqual({
			kind: "beingRedone",
			days: WEDNESDAY_TO_THURSDAY,
		});
	});

	it("given_aRedoPartElsewhereInTheWeek_when_asked_then_none", () => {
		const mondayToTuesday = { ...wholeWeek, coveredTo: "2026-11-17" };

		expect(partRedoOf(mondayToTuesday, [mondayToTuesday, redo])).toBe(
			undefined
		);
	});
});

describe("weekRunsAround", () => {
	/** A part of the week of Mon 15 Feb 2027, to review unless `overrides` say. */
	const part = (overrides: Partial<WeekPart>): WeekPart => ({
		scheduleId: "s-1",
		name: "Week of 2027-02-15",
		named: false,
		coveredFrom: "2027-02-15",
		coveredTo: "2027-02-21",
		state: "TO_REVIEW",
		redoing: false,
		...overrides,
	});
	/** The part as the roster page shows it, with its week's Monday. */
	const shown = (shownPart: WeekPart): WeekPart & { periodStart: string } => ({
		...shownPart,
		periodStart: "2027-02-15",
	});
	const BEFORE_THE_WEEK = "2027-02-10";
	const wednesdayToFriday = part({
		coveredFrom: "2027-02-17",
		coveredTo: "2027-02-19",
	});
	const saturdayToSunday = part({
		scheduleId: "s-2",
		coveredFrom: "2027-02-20",
		coveredTo: "2027-02-21",
	});

	it("given_aPartCoveringTheWholeWeek_when_split_then_noRuns", () => {
		const wholeWeek = part({});

		expect(
			weekRunsAround(shown(wholeWeek), [wholeWeek], BEFORE_THE_WEEK)
		).toEqual([]);
	});

	it("given_thePartFromWednesdayWithNothingBefore_when_split_then_mondayTuesdayHaveNoneAndTheWeekendIsAnotherPart", () => {
		expect(
			weekRunsAround(
				shown(wednesdayToFriday),
				[wednesdayToFriday, saturdayToSunday],
				BEFORE_THE_WEEK
			)
		).toEqual([
			{ kind: "noneBefore", days: { from: "2027-02-15", to: "2027-02-16" } },
			{
				kind: "otherPart",
				days: { from: "2027-02-20", to: "2027-02-21" },
				part: { scheduleId: "s-2", state: "TO_REVIEW" },
			},
		]);
	});

	it("given_thePartWithAnotherPartBeforeIt_when_split_then_mondayTuesdayHaveNoneAndWednesdayToFridayIsAnotherPart", () => {
		expect(
			weekRunsAround(
				shown(saturdayToSunday),
				[wednesdayToFriday, saturdayToSunday],
				BEFORE_THE_WEEK
			)
		).toEqual([
			{ kind: "noneBefore", days: { from: "2027-02-15", to: "2027-02-16" } },
			{
				kind: "otherPart",
				days: { from: "2027-02-17", to: "2027-02-19" },
				part: { scheduleId: "s-1", state: "TO_REVIEW" },
			},
		]);
	});

	it("given_aPartEndingFriday_when_split_then_theWeekendIsStillToSchedule", () => {
		expect(
			weekRunsAround(
				shown(wednesdayToFriday),
				[wednesdayToFriday],
				BEFORE_THE_WEEK
			)
		).toContainEqual({
			kind: "noneAfter",
			days: { from: "2027-02-20", to: "2027-02-21" },
		});
	});

	it("given_aRedoPartInsideAWiderPart_when_split_then_theWiderPartHoldsTheDaysOnEitherSide", () => {
		const wholeWeek = part({});
		const redo = part({
			scheduleId: "s-2",
			coveredFrom: "2027-02-17",
			coveredTo: "2027-02-18",
			state: "GENERATING",
			redoing: true,
		});
		const heldByTheWholeWeek = { scheduleId: "s-1", state: "TO_REVIEW" };

		expect(
			weekRunsAround(shown(redo), [wholeWeek, redo], BEFORE_THE_WEEK)
		).toEqual([
			{
				kind: "otherPart",
				days: { from: "2027-02-15", to: "2027-02-16" },
				part: heldByTheWholeWeek,
			},
			{
				kind: "otherPart",
				days: { from: "2027-02-19", to: "2027-02-21" },
				part: heldByTheWholeWeek,
			},
		]);
	});

	it("given_todayIsTuesday_when_split_then_mondayHasPassedAndTuesdayHasNone", () => {
		expect(
			weekRunsAround(
				shown(wednesdayToFriday),
				[wednesdayToFriday, saturdayToSunday],
				"2027-02-16"
			).slice(0, 2)
		).toEqual([
			{
				kind: "passedBefore",
				days: { from: "2027-02-15", to: "2027-02-15" },
			},
			{ kind: "noneBefore", days: { from: "2027-02-16", to: "2027-02-16" } },
		]);
	});
});
describe("datesGenerationBody", () => {
	const everything = { shiftIds: ["sh-1", "sh-2"], constraintIds: ["c-1"] };
	const setup = {
		firstDay: "2026-11-19",
		lastDay: "2026-11-28",
		name: " Year-end gala ",
		includeLeave: true,
	};

	it("given_aNameAndNoWeekChosen_when_sent_then_theDaysTheTrimmedNameAndEverythingForEachNewWeek", () => {
		expect(
			datesGenerationBody(setup, datesPlanFixture(), {}, everything)
		).toStrictEqual({
			firstDay: "2026-11-19",
			lastDay: "2026-11-28",
			name: "Year-end gala",
			includeLeave: true,
			newWeeks: [
				{
					periodStart: "2026-11-16",
					includedShiftIds: ["sh-1", "sh-2"],
					includedConstraintIds: ["c-1"],
				},
				{
					periodStart: "2026-11-23",
					includedShiftIds: ["sh-1", "sh-2"],
					includedConstraintIds: ["c-1"],
				},
			],
		});
	});

	it("given_noNameAKeptWeekAndAWeeksOwnChoice_when_sent_then_noNameOnlyTheCreatedWeekWithItsChoice", () => {
		expect(
			datesGenerationBody(
				{ ...setup, name: "  ", includeLeave: false },
				datesPlanWithKeptWeekFixture(),
				{ "2026-11-16": { shiftIds: ["sh-2"], constraintIds: [] } },
				everything
			)
		).toStrictEqual({
			firstDay: "2026-11-19",
			lastDay: "2026-11-28",
			includeLeave: false,
			newWeeks: [
				{
					periodStart: "2026-11-16",
					includedShiftIds: ["sh-2"],
					includedConstraintIds: [],
				},
			],
		});
	});
});
