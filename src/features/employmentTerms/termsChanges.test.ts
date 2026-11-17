import { describe, expect, it } from "vitest";
import i18n from "i18next";
import "@/common/i18n";
import type { IsoDate } from "@/components/forms/Calendar";
import {
	FIVE_DAY_WEEK,
	SIX_DAY_SHIFT,
} from "@/features/employmentTerms/fixtures";
import {
	isMonday,
	needsApplyChoice,
	nextMonday,
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
	restDay: terms.restDay,
	dailyOvertime: terms.dailyOvertime,
	hoursLimitsApply: terms.hoursLimitsApply,
	overtimePercent: terms.overtimePercent,
	restDayWorkPercent: terms.restDayWorkPercent,
	dayOffWorkPercent: terms.dayOffWorkPercent,
	extraHoursPaidAs: terms.extraHoursPaidAs,
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
