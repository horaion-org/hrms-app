import { describe, expect, it } from "vitest";
import { authTestI18n } from "@/features/auth/testingI18n";
import {
	type WeekState,
	weekStateSchema,
} from "@/features/scheduling/months/api";
import { monthSummaryFixture } from "@/features/scheduling/months/fixtures";
import {
	badgeOf,
	chosenWeeksNow,
	defaultMonthOf,
	defaultTicksOf,
	skippedWeeksOf,
	tickableWeekOf,
	tickableWeeksOf,
	tickedRangesOf,
} from "@/features/scheduling/months/weekTicks";
import { weekStateTones } from "@/features/scheduling/months/weekStateLooks";

/** Tuesday 17 November 2026: the week of 16 Nov has started. */
const TODAY = "2026-11-17";
const STARTED_MONDAY = "2026-11-16";
const NEXT_MONDAY = "2026-11-23";

const weekOf = (
	periodStart: string,
	state: WeekState,
	includedInMonthGeneration?: boolean
): {
	periodStart: string;
	state: WeekState;
	includedInMonthGeneration?: boolean;
} => ({ periodStart, state, includedInMonthGeneration });

describe("tickableWeekOf", () => {
	it("given_aPublishedWeek_when_read_then_lockedAsPublished", () => {
		expect(
			tickableWeekOf(weekOf(NEXT_MONDAY, "PUBLISHED", false), TODAY)
		).toEqual({
			periodStart: NEXT_MONDAY,
			periodEnd: "2026-11-29",
			state: "PUBLISHED",
			look: "PUBLISHED",
			canTick: false,
			tickedByDefault: false,
			note: undefined,
		});
	});

	it("given_aGeneratingWeek_when_read_then_lockedAsGenerating", () => {
		expect(
			tickableWeekOf(weekOf(NEXT_MONDAY, "GENERATING", false), TODAY)
		).toMatchObject({
			look: "GENERATING",
			canTick: false,
			tickedByDefault: false,
		});
	});

	it("given_aWeekTheApiLeavesOutOrWhoseSundayHasPassed_when_read_then_lockedAsOver", () => {
		expect(
			tickableWeekOf(weekOf(NEXT_MONDAY, "DRAFT", false), TODAY)
		).toMatchObject({ look: "OVER", canTick: false, tickedByDefault: false });
		expect(
			tickableWeekOf(weekOf("2026-11-02", "NOT_GENERATED"), TODAY)
		).toMatchObject({ look: "OVER", canTick: false, tickedByDefault: false });
	});

	it("given_theApiStillGeneratesAWeekTheBrowserThinksIsOver_when_read_then_theApiDecides", () => {
		// The browser is a day ahead of the branch: its today is the Monday after the week.
		expect(
			tickableWeekOf(weekOf("2026-11-09", "NOT_GENERATED", true), "2026-11-16")
		).toMatchObject({ look: "STARTED", canTick: true });
	});

	it("given_aWeekOfAnUnknownState_when_read_then_locked", () => {
		expect(
			tickableWeekOf(weekOf(NEXT_MONDAY, "UNKNOWN", true), TODAY)
		).toMatchObject({
			look: "UNKNOWN",
			canTick: false,
			tickedByDefault: false,
		});
	});

	it.each(["TO_REVIEW", "TENTATIVE"] as const)(
		"given_a%sWeek_when_read_then_tickableButUntickedWithTheRosterNote",
		(state) => {
			expect(
				tickableWeekOf(weekOf(NEXT_MONDAY, state, true), TODAY)
			).toMatchObject({
				look: state,
				canTick: true,
				tickedByDefault: false,
				note: "rosterWaiting",
			});
		}
	);

	it("given_aRejectedWeek_when_read_then_tickableButUntickedWithTheRejectedNote", () => {
		expect(
			tickableWeekOf(weekOf(NEXT_MONDAY, "REJECTED", true), TODAY)
		).toMatchObject({
			look: "REJECTED",
			canTick: true,
			tickedByDefault: false,
			note: "rosterRejected",
		});
	});

	it("given_aStartedWeekWithoutARoster_when_read_then_tickableButUntickedAsStarted", () => {
		expect(
			tickableWeekOf(weekOf(STARTED_MONDAY, "NOT_GENERATED", true), TODAY)
		).toMatchObject({
			look: "STARTED",
			canTick: true,
			tickedByDefault: false,
			note: "started",
		});
	});

	it.each(["NOT_GENERATED", "DRAFT", "FAILED"] as const)(
		"given_a%sWeekAhead_when_read_then_tickedByDefault",
		(state) => {
			expect(
				tickableWeekOf(weekOf(NEXT_MONDAY, state, true), TODAY)
			).toMatchObject({
				look: state,
				canTick: true,
				tickedByDefault: true,
				note: undefined,
			});
		}
	);

	it("given_aStartedWeekUnderReview_when_read_then_looksUnderReviewWithTheRosterNote", () => {
		expect(
			tickableWeekOf(weekOf(STARTED_MONDAY, "TO_REVIEW", true), TODAY)
		).toMatchObject({ look: "TO_REVIEW", note: "rosterWaiting" });
	});

	it("given_today_isTheMonday_when_read_then_notStartedAndTicked", () => {
		expect(
			tickableWeekOf(
				weekOf(STARTED_MONDAY, "NOT_GENERATED", true),
				STARTED_MONDAY
			)
		).toMatchObject({ look: "NOT_GENERATED", tickedByDefault: true });
	});
});

describe("tickableWeeksOf", () => {
	it("given_aMonthsWeeks_when_read_then_eachInOrder", () => {
		expect(
			tickableWeeksOf(
				[
					weekOf(STARTED_MONDAY, "NOT_GENERATED", true),
					weekOf(NEXT_MONDAY, "NOT_GENERATED", true),
				],
				TODAY
			).map((week) => week.look)
		).toEqual(["STARTED", "NOT_GENERATED"]);
	});
});

describe("defaultTicksOf", () => {
	it("given_aMidWeekMonth_when_ticked_then_onlyTheWeeksAhead", () => {
		const weeks = tickableWeeksOf(
			[
				weekOf("2026-11-09", "PUBLISHED", false),
				weekOf(STARTED_MONDAY, "NOT_GENERATED", true),
				weekOf(NEXT_MONDAY, "NOT_GENERATED", true),
				weekOf("2026-11-30", "TO_REVIEW", true),
			],
			TODAY
		);

		expect(defaultTicksOf(weeks)).toEqual([NEXT_MONDAY]);
	});
});

describe("tickedRangesOf", () => {
	it("given_touchingAndSeparateMondays_when_ranged_then_joinedAndSplit", () => {
		expect(tickedRangesOf(["2026-11-23", "2026-11-30", "2026-12-14"])).toEqual([
			{ start: "2026-11-23", end: "2026-12-06" },
			{ start: "2026-12-14", end: "2026-12-20" },
		]);
	});

	it("given_unorderedMondays_when_ranged_then_inDateOrder", () => {
		expect(tickedRangesOf(["2026-12-14", "2026-11-23"])).toEqual([
			{ start: "2026-11-23", end: "2026-11-29" },
			{ start: "2026-12-14", end: "2026-12-20" },
		]);
	});
});

describe("skippedWeeksOf", () => {
	const DECEMBER = tickableWeeksOf(
		[
			weekOf("2026-12-07", "NOT_GENERATED", true),
			weekOf("2026-12-14", "NOT_GENERATED", true),
			weekOf("2026-12-21", "TO_REVIEW", true),
			weekOf("2026-12-28", "NOT_GENERATED", true),
		],
		TODAY
	);

	it("given_anUntickedWeekWithoutARosterBetweenTickedWeeks_when_skipped_then_named", () => {
		expect(
			skippedWeeksOf(DECEMBER, ["2026-12-28", "2026-12-07"]).map(
				(week) => week.periodStart
			)
		).toEqual(["2026-12-14"]);
	});

	it("given_untickedWeeksOutsideTheTickedOnesOrWithARoster_when_skipped_then_none", () => {
		expect(skippedWeeksOf(DECEMBER, ["2026-12-14"])).toEqual([]);
		expect(skippedWeeksOf(DECEMBER, ["2026-12-14", "2026-12-28"])).toEqual([]);
		expect(skippedWeeksOf(DECEMBER, [])).toEqual([]);
	});
});

describe("defaultMonthOf", () => {
	const MONTHS = ["2026-11", "2026-12", "2027-01"];

	it("given_thisMonthsLastWeekStarted_when_defaultMonth_then_nextMonth", () => {
		expect(defaultMonthOf(MONTHS, "2026-12-01", [])).toBe("2026-12");
	});

	it("given_aDepartmentWhoseRemainingWeeksAreAllDecided_when_defaultMonth_then_theFirstMonthWithAWeekToSchedule", () => {
		const november = monthSummaryFixture({
			weeks: [
				{ periodStart: "2026-11-02", state: "PUBLISHED", scheduleId: "s-1" },
				{ periodStart: "2026-11-09", state: "PUBLISHED", scheduleId: "s-2" },
				{ periodStart: STARTED_MONDAY, state: "TO_REVIEW", scheduleId: "s-3" },
				{ periodStart: NEXT_MONDAY, state: "TENTATIVE", scheduleId: "s-4" },
				{ periodStart: "2026-11-30", state: "TENTATIVE", scheduleId: "s-5" },
			],
		});

		expect(defaultMonthOf(MONTHS, TODAY, [november])).toBe("2026-12");
	});

	it("given_noMonthWithATick_when_defaultMonth_then_theFirstMonth", () => {
		const november = monthSummaryFixture({
			weeks: [
				"2026-11-02",
				"2026-11-09",
				STARTED_MONDAY,
				NEXT_MONDAY,
				"2026-11-30",
			].map((periodStart) => ({
				periodStart,
				state: "PUBLISHED" as const,
				scheduleId: "s-1",
			})),
		});

		expect(defaultMonthOf(["2026-11"], TODAY, [november])).toBe("2026-11");
	});
});

describe("badgeOf", () => {
	it("given_eachLook_when_badged_then_theMonthPagesWordAndTone", () => {
		for (const state of weekStateSchema.unwrap().options) {
			expect(badgeOf(state)).toEqual({
				tone: weekStateTones[state],
				key: `scheduling.months.states.${state}`,
			});
		}
		for (const look of ["OVER", "STARTED"] as const) {
			const badge = badgeOf(look);
			expect(badge.tone).toBe("neutral");
			expect(authTestI18n.exists(badge.key)).toBe(true);
		}
	});
});

describe("chosenWeeksNow", () => {
	it("given_chosenWeeksThatChangedSinceSetup_when_read_then_keepsTheTickableDropsTheRestAndNamesTheRostered", () => {
		const weeks = tickableWeeksOf(
			[
				weekOf(NEXT_MONDAY, "GENERATING", false),
				weekOf("2026-11-30", "TO_REVIEW", true),
				weekOf("2026-12-07", "NOT_GENERATED", true),
			],
			TODAY
		);

		const now = chosenWeeksNow(weeks, [
			NEXT_MONDAY,
			"2026-11-30",
			"2026-12-07",
		]);

		expect(now.kept).toEqual(["2026-11-30", "2026-12-07"]);
		expect(now.dropped.map((week) => week.periodStart)).toEqual([NEXT_MONDAY]);
		expect(now.replacing.map((week) => week.periodStart)).toEqual([
			"2026-11-30",
		]);
	});

	it("given_noChosenWeekTickableAnyMore_when_read_then_nothingKept", () => {
		const weeks = tickableWeeksOf(
			[weekOf(NEXT_MONDAY, "PUBLISHED", false)],
			TODAY
		);

		expect(chosenWeeksNow(weeks, [NEXT_MONDAY])).toEqual({
			kept: [],
			dropped: weeks,
			replacing: [],
		});
	});
});
