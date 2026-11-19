import { describe, expect, it } from "vitest";
import type { WeekPart, WeekState } from "@/features/scheduling/months/api";
import {
	monthWeekFixture,
	twoPartWeekFixture,
} from "@/features/scheduling/months/fixtures";
import { weekHeadline } from "@/features/scheduling/months/weekHeadline";

/** A week of three parts in day order (s-1, s-2, s-3), the newest (s-3) on the week itself. */
const threePartWeek = (
	states: [WeekState, WeekState, WeekState]
): Parameters<typeof weekHeadline>[0] => {
	const [first] = twoPartWeekFixture();
	const parts: Array<WeekPart> = states.map((state, index) => ({
		...first!,
		scheduleId: `s-${index + 1}`,
		state,
	}));
	return { state: states[2], scheduleId: "s-3", parts };
};

describe("weekHeadline", () => {
	it("given_aWeekOfOneSchedule_when_shown_then_itsOwnStateAndSchedule", () => {
		const week = monthWeekFixture({
			state: "TO_REVIEW",
			scheduleId: "s-9",
			parts: twoPartWeekFixture().slice(0, 1),
		});

		expect(weekHeadline(week)).toEqual({
			state: "TO_REVIEW",
			scheduleId: "s-9",
		});
	});

	it("given_aWeekWithoutSchedule_when_shown_then_itsOwnState", () => {
		const week = monthWeekFixture({ state: "NOT_GENERATED", scheduleId: null });

		expect(weekHeadline(week)).toEqual({
			state: "NOT_GENERATED",
			scheduleId: null,
		});
	});

	it.each([
		[
			"allPublished",
			["PUBLISHED", "PUBLISHED", "PUBLISHED"],
			"PUBLISHED",
			"s-1",
		],
		[
			"oneToReviewAmongPublished",
			["PUBLISHED", "TO_REVIEW", "PUBLISHED"],
			"TO_REVIEW",
			"s-2",
		],
		[
			"oneGenerating",
			["PUBLISHED", "PUBLISHED", "GENERATING"],
			"GENERATING",
			"s-3",
		],
		[
			"oneFailedBeforeOneToReview",
			["TO_REVIEW", "FAILED", "PUBLISHED"],
			"FAILED",
			"s-2",
		],
		[
			"twoToReview",
			["PUBLISHED", "TO_REVIEW", "TO_REVIEW"],
			"TO_REVIEW",
			"s-2",
		],
	] as const)(
		"given_%s_when_shown_then_thePartNeedingAttentionFirst",
		(_case, states, state, scheduleId) => {
			expect(weekHeadline(threePartWeek([...states]))).toEqual({
				state,
				scheduleId,
			});
		}
	);
});
