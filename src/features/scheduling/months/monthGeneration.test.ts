import { describe, expect, it } from "vitest";
import {
	monthGenerationFixture,
	monthWeekFixture,
	scheduleMonthFixture,
	ungeneratedMonthFixture,
} from "@/features/scheduling/months/fixtures";
import type { MonthWeek } from "@/features/scheduling/months/api";
import {
	coveredWeeks,
	generateMonthBody,
	handChangedCoveredWeeks,
	isGenerating,
	refusedWeeks,
	showsBeforeGenerate,
	showsRegenerate,
	startingWeekOf,
	startingWeeksOf,
	weekNameOf,
	weeksNoLongerCovered,
	weeksToCreate,
} from "@/features/scheduling/months/monthGeneration";

describe("month generation", () => {
	it("given_aMonthNothingWasGeneratedIn_when_read_then_everyWeekIsCreatedAndBeforeGenerateShows", () => {
		const month = ungeneratedMonthFixture();

		expect(weeksToCreate(month).map((week) => week.periodStart)).toEqual([
			"2026-12-07",
			"2026-12-14",
			"2026-12-21",
			"2026-12-28",
		]);
		expect(showsBeforeGenerate(month)).toBe(true);
		expect(isGenerating(month)).toBe(false);
	});

	it("given_aWeekBeingGenerated_when_read_then_beforeGenerateHides", () => {
		const month = ungeneratedMonthFixture();
		const generating = {
			...month,
			weeks: [
				{
					...month.weeks[0]!,
					state: "GENERATING" as const,
					includedInMonthGeneration: false,
				},
				...month.weeks.slice(1),
			],
		};

		expect(isGenerating(generating)).toBe(true);
		expect(showsBeforeGenerate(generating)).toBe(false);
	});

	it("given_everyCoveredWeekHasARoster_when_read_then_beforeGenerateHides", () => {
		const month = scheduleMonthFixture({
			weeks: [
				monthWeekFixture({
					state: "TO_REVIEW",
					includedInMonthGeneration: true,
				}),
				monthWeekFixture({
					state: "PUBLISHED",
					includedInMonthGeneration: false,
				}),
			],
		});

		expect(showsBeforeGenerate(month)).toBe(false);
		expect(coveredWeeks(month)).toHaveLength(1);
	});

	it("given_aCoveredDraft_when_read_then_beforeGenerateShowsWithNothingToCreate", () => {
		const month = scheduleMonthFixture({
			weeks: [
				monthWeekFixture({ state: "DRAFT", includedInMonthGeneration: true }),
			],
		});

		expect(showsBeforeGenerate(month)).toBe(true);
		expect(weeksToCreate(month)).toEqual([]);
	});

	it("given_handChangedWeeks_when_read_then_onlyTheCoveredOnesAreNamed", () => {
		const month = scheduleMonthFixture({
			weeks: [
				monthWeekFixture({
					state: "PUBLISHED",
					handChangedDays: 2,
					includedInMonthGeneration: false,
				}),
				monthWeekFixture({
					periodStart: "2026-11-09",
					state: "TO_REVIEW",
					handChangedDays: 1,
					includedInMonthGeneration: true,
				}),
				monthWeekFixture({
					periodStart: "2026-11-16",
					state: "TENTATIVE",
					handChangedDays: 0,
					includedInMonthGeneration: true,
				}),
			],
		});

		expect(
			handChangedCoveredWeeks(month).map((week) => week.periodStart)
		).toEqual(["2026-11-09"]);
	});

	it("given_anAnswerWithARefusedWeek_when_read_then_itsCodeByMonday", () => {
		const answer = monthGenerationFixture();
		answer.weeks[1] = {
			...answer.weeks[1]!,
			outcome: "REFUSED",
			scheduleId: null,
			reason: "SCHEDULE_HAS_NO_EMPLOYEES",
		};
		answer.weeks[2] = {
			...answer.weeks[2]!,
			outcome: "LEFT_AS_IS",
			reason: "PUBLISHED",
		};

		expect(refusedWeeks(answer)).toEqual({
			"2026-12-14": "SCHEDULE_HAS_NO_EMPLOYEES",
		});
	});
});

describe("showsRegenerate", () => {
	it("given_everyCoveredWeekGenerated_when_read_then_shows", () => {
		const month = scheduleMonthFixture({
			weeks: [
				monthWeekFixture({
					state: "TO_REVIEW",
					includedInMonthGeneration: true,
				}),
				monthWeekFixture({
					state: "TENTATIVE",
					includedInMonthGeneration: true,
				}),
			],
		});

		expect(showsRegenerate(month)).toBe(true);
	});

	it("given_aCoveredDraft_when_read_then_hidesForBeforeGenerate", () => {
		const month = scheduleMonthFixture({
			weeks: [
				monthWeekFixture({
					state: "TO_REVIEW",
					includedInMonthGeneration: true,
				}),
				monthWeekFixture({ state: "DRAFT", includedInMonthGeneration: true }),
			],
		});

		expect(showsRegenerate(month)).toBe(false);
	});

	it("given_aWeekBeingGenerated_when_read_then_hides", () => {
		const month = scheduleMonthFixture({
			weeks: [
				monthWeekFixture({
					state: "GENERATING",
					includedInMonthGeneration: false,
				}),
				monthWeekFixture({
					state: "TENTATIVE",
					includedInMonthGeneration: true,
				}),
			],
		});

		expect(showsRegenerate(month)).toBe(false);
	});

	it("given_everyWeekPublished_when_read_then_hides", () => {
		const month = scheduleMonthFixture({
			weeks: [
				monthWeekFixture({
					state: "PUBLISHED",
					includedInMonthGeneration: false,
				}),
				monthWeekFixture({
					state: "PUBLISHED",
					includedInMonthGeneration: false,
				}),
			],
		});

		expect(showsRegenerate(month)).toBe(false);
	});
});

describe("startingWeekOf", () => {
	const firstWeekAs = (
		state: "NOT_GENERATED" | "DRAFT" | "TO_REVIEW"
	): ReturnType<typeof ungeneratedMonthFixture> => {
		const month = ungeneratedMonthFixture();
		return {
			...month,
			weeks: month.weeks.map((week, index) =>
				index === 0 ? { ...week, state } : week
			),
		};
	};

	it("given_theFirstCoveredWeekNotGenerated_when_read_then_thatWeek", () => {
		expect(startingWeekOf(firstWeekAs("NOT_GENERATED"))?.periodStart).toBe(
			"2026-12-07"
		);
	});

	it("given_theFirstCoveredWeekADraft_when_read_then_thatWeek", () => {
		expect(startingWeekOf(firstWeekAs("DRAFT"))?.periodStart).toBe(
			"2026-12-07"
		);
	});

	it("given_theFirstCoveredWeekUnderReview_when_read_then_none", () => {
		expect(startingWeekOf(firstWeekAs("TO_REVIEW"))).toBeUndefined();
	});

	it("given_nothingCovered_when_read_then_none", () => {
		const month = ungeneratedMonthFixture();
		expect(
			startingWeekOf({
				...month,
				weeks: month.weeks.map((week) => ({
					...week,
					includedInMonthGeneration: false,
				})),
			})
		).toBeUndefined();
	});
});

/** Kitchen's December with the given states by Monday; a generating week is not covered, as the API says. */
const decemberWith = (
	states: Record<string, MonthWeek["state"]>
): ReturnType<typeof ungeneratedMonthFixture> => {
	const month = ungeneratedMonthFixture();
	return {
		...month,
		weeks: month.weeks.map((week) => {
			const state = states[week.periodStart] ?? week.state;
			return {
				...week,
				state,
				includedInMonthGeneration: state !== "GENERATING",
			};
		}),
	};
};

const mondaysOf = (weeks: Array<MonthWeek>): Array<string> =>
	weeks.map((week) => week.periodStart);

describe("chosen weeks", () => {
	const EVERYTHING = { shiftIds: ["sh-1"], constraintIds: ["co-1"] };
	const SETUP = { includeLeave: true };

	it("given_someWeeksChosen_when_bodyBuilt_then_weeksAreTheChosenMondaysAndNewWeeksOnlyTheChosenOnesToCreate", () => {
		const month = decemberWith({ "2026-12-14": "DRAFT" });

		const body = generateMonthBody(month, {}, EVERYTHING, SETUP, [
			"2026-12-21",
			"2026-12-14",
		]);

		expect(body.weeks).toEqual(["2026-12-14", "2026-12-21"]);
		expect(body.newWeeks).toEqual([
			{
				periodStart: "2026-12-21",
				includedShiftIds: ["sh-1"],
				includedConstraintIds: ["co-1"],
			},
		]);
	});

	it("given_noChoiceOfWeeks_when_bodyBuilt_then_everyCoveredWeekIsSent", () => {
		const month = decemberWith({ "2026-12-07": "GENERATING" });

		const body = generateMonthBody(month, {}, EVERYTHING, SETUP);

		expect(body.weeks).toEqual(["2026-12-14", "2026-12-21", "2026-12-28"]);
		expect(body.newWeeks.map((week) => week.periodStart)).toEqual(body.weeks);
	});

	it("given_theFirstWeekNotChosen_when_startingWeekOf_then_theFirstChosenWeek", () => {
		expect(
			startingWeekOf(ungeneratedMonthFixture(), ["2026-12-14", "2026-12-21"])
				?.periodStart
		).toBe("2026-12-14");
	});

	it("given_consecutiveChosenWeeks_when_startingWeeksOf_then_onlyTheFirst", () => {
		expect(
			mondaysOf(
				startingWeeksOf(ungeneratedMonthFixture(), [
					"2026-12-14",
					"2026-12-21",
					"2026-12-28",
				])
			)
		).toEqual(["2026-12-14"]);
	});

	it("given_aChosenWeekAfterAnUnchosenWeekWithoutARoster_when_startingWeeksOf_then_bothChosenWeeks", () => {
		expect(
			mondaysOf(
				startingWeeksOf(ungeneratedMonthFixture(), ["2026-12-07", "2026-12-21"])
			)
		).toEqual(["2026-12-07", "2026-12-21"]);
	});

	it("given_aChosenWeekAfterAnUnchosenWeekUnderReview_when_startingWeeksOf_then_onlyTheFirst", () => {
		const month = decemberWith({ "2026-12-14": "TO_REVIEW" });

		expect(
			mondaysOf(startingWeeksOf(month, ["2026-12-07", "2026-12-21"]))
		).toEqual(["2026-12-07"]);
	});

	it("given_aChosenWeekAfterAGeneratingWeek_when_startingWeeksOf_then_notIncluded", () => {
		const month = decemberWith({ "2026-12-14": "GENERATING" });

		expect(
			mondaysOf(startingWeeksOf(month, ["2026-12-07", "2026-12-21"]))
		).toEqual(["2026-12-07"]);
	});

	it("given_theFirstChosenWeekUnderReview_when_startingWeeksOf_then_onlyLaterGapWeeks", () => {
		const month = decemberWith({ "2026-12-07": "TO_REVIEW" });

		expect(
			mondaysOf(startingWeeksOf(month, ["2026-12-07", "2026-12-21"]))
		).toEqual(["2026-12-21"]);
	});
});

describe("weekNameOf", () => {
	it("given_aMonday_when_named_then_asTheApiNamesTheWeeksItCreates", () => {
		expect(weekNameOf("2026-11-02")).toBe("Week of 2026-11-02");
	});
});

describe("weeksNoLongerCovered", () => {
	it("given_sentWeeksTheMonthNoLongerCovers_when_asked_then_thoseWeeksOnly", () => {
		const month = ungeneratedMonthFixture();
		month.weeks[1] = {
			...month.weeks[1]!,
			state: "PUBLISHED",
			includedInMonthGeneration: false,
		};
		month.weeks[3] = { ...month.weeks[3]!, includedInMonthGeneration: false };

		expect(
			weeksNoLongerCovered(["2026-12-07", "2026-12-14"], month).map(
				(week) => week.periodStart
			)
		).toEqual(["2026-12-14"]);
	});
});
