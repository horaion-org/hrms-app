import { describe, expect, it } from "vitest";
import {
	monthGenerationFixture,
	monthWeekFixture,
	scheduleMonthFixture,
	ungeneratedMonthFixture,
} from "@/features/scheduling/months/fixtures";
import {
	coveredWeeks,
	handChangedCoveredWeeks,
	isGenerating,
	refusedWeeks,
	showsBeforeGenerate,
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
