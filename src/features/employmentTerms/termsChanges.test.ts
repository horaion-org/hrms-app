import { describe, expect, it } from "vitest";
import i18n from "i18next";
import "@/common/i18n";
import type { IsoDate } from "@/components/forms/Calendar";
import {
	FIVE_DAY_WEEK,
	PART_TIME_BELOW_MINUTES,
	SIX_DAY_SHIFT,
} from "@/features/employmentTerms/fixtures";
import {
	isMonday,
	needsApplyChoice,
	nextMonday,
	partTimeMismatch,
	successorNameOf,
} from "@/features/employmentTerms/termsChanges";

const t = i18n.getFixedT("en");
const bodyOf = (
	terms: typeof SIX_DAY_SHIFT
): Parameters<typeof needsApplyChoice>[1] => ({
	name: terms.name,
	description: terms.description,
	daysPerWeek: terms.daysPerWeek,
	weekMinutes: terms.weekMinutes,
	dayMinutes: terms.dayMinutes,
	mostWeekMinutes: terms.mostWeekMinutes,
	restDay: terms.restDay,
	dailyOvertime: terms.dailyOvertime,
	shiftWork: terms.shiftWork,
	hoursLimitsApply: terms.hoursLimitsApply,
});

describe("needsApplyChoice", () => {
	it("asks only when held terms change their week", () => {
		const body = bodyOf(SIX_DAY_SHIFT);
		expect(
			needsApplyChoice(SIX_DAY_SHIFT, { ...body, weekMinutes: 2520 })
		).toBe(true);
		expect(needsApplyChoice(SIX_DAY_SHIFT, { ...body, restDay: "SUN" })).toBe(
			true
		);
		expect(needsApplyChoice(SIX_DAY_SHIFT, { ...body, name: "Guards" })).toBe(
			false
		);
		expect(
			needsApplyChoice(SIX_DAY_SHIFT, { ...body, description: "Night" })
		).toBe(false);
	});

	it("asks when held terms change their most hours a week, not when it stays", () => {
		const held = { ...SIX_DAY_SHIFT, mostWeekMinutes: 4320 };
		const body = bodyOf(held);
		expect(needsApplyChoice(held, { ...body, mostWeekMinutes: 3600 })).toBe(
			true
		);
		expect(needsApplyChoice(held, { ...body, mostWeekMinutes: null })).toBe(
			true
		);
		expect(needsApplyChoice(held, body)).toBe(false);
	});

	it("never asks for terms nobody holds or is scheduled onto", () => {
		expect(
			needsApplyChoice(FIVE_DAY_WEEK, {
				...bodyOf(FIVE_DAY_WEEK),
				weekMinutes: 2520,
			})
		).toBe(false);
		expect(
			needsApplyChoice(
				{ ...FIVE_DAY_WEEK, scheduledCount: 1 },
				{ ...bodyOf(FIVE_DAY_WEEK), weekMinutes: 2520 }
			)
		).toBe(true);
	});
});

describe("Mondays", () => {
	it.each<[IsoDate, boolean]>([
		["2026-11-09", true],
		["2026-11-05", false],
		["2027-01-04", true],
	])("%s is a Monday: %s", (date, monday) => {
		expect(isMonday(date)).toBe(monday);
	});

	it.each<[IsoDate, IsoDate]>([
		["2026-11-05", "2026-11-09"],
		["2026-11-09", "2026-11-16"],
		["2026-11-08", "2026-11-09"],
	])("the Monday after %s is %s", (today, monday) => {
		expect(nextMonday(today)).toBe(monday);
	});
});

describe("successorNameOf", () => {
	it("swaps the hours in a name that has them", () => {
		expect(
			successorNameOf(
				"Five-day week, 44 h",
				{ weekMinutes: 2520 },
				"2027-01-04",
				t,
				"en"
			)
		).toBe("Five-day week, 42 h");
	});

	it("adds the date to a name without hours", () => {
		expect(
			successorNameOf(
				"Standard week",
				{ weekMinutes: 2520 },
				"2027-01-04",
				t,
				"en"
			)
		).toBe("Standard week from 4 Jan 2027");
	});
});

describe("partTimeMismatch", () => {
	it.each<
		[string | null, number, number | null, ReturnType<typeof partTimeMismatch>]
	>([
		["PART_TIME", 2640, null, "partTimeOnFullTerms"],
		["PART_TIME", 2640, 1200, undefined],
		["FULL_TIME", 1200, null, "fullTimeOnPartTerms"],
		["FULL_TIME", 2640, null, undefined],
		["CONTRACT", 1200, null, undefined],
		[null, 1200, null, undefined],
	])("%s on a %i-minute week with own week %s", (type, week, own, result) => {
		expect(partTimeMismatch(type, week, own, PART_TIME_BELOW_MINUTES)).toBe(
			result
		);
	});

	it("says nothing without a part-time line", () => {
		expect(partTimeMismatch("PART_TIME", 2640, null, null)).toBeUndefined();
	});
});
