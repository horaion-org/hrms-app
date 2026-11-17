import { describe, expect, it } from "vitest";
import i18n from "i18next";
import "@/common/i18n";
import type { WeekFields } from "@/features/employmentTerms/api";
import {
	FIVE_DAY_WEEK,
	PART_TIME_20,
	PART_TIME_BELOW_MINUTES,
	REFERENCE,
	SIX_DAY_SHIFT,
} from "@/features/employmentTerms/fixtures";
import {
	overtimeShort,
	suggestedTermsName,
	weekLines,
} from "@/features/employmentTerms/summary";

const t = i18n.getFixedT("en");

describe("weekLines and overtimeShort", () => {
	it.each<[string, WeekFields, Array<string>, string]>([
		[
			"a five-day week",
			FIVE_DAY_WEEK,
			["44 h over 5 days", "Rest day Sunday"],
			"Overtime after 8 h 48 min a day or 44 h a week, at 1.5 times",
		],
		[
			"shift work",
			SIX_DAY_SHIFT,
			["44 h over 6 days", "Shifts up to 12 h", "Roster picks the rest day"],
			"Overtime by the week, after 44 h, at 1.5 times",
		],
		[
			"part-time, with no rest day",
			PART_TIME_20,
			["20 h a week", "Days vary"],
			"Extra hours up to 44 h, then overtime, at 1.5 times",
		],
	])("words %s for the list", (_, fields, lines, overtime) => {
		expect(weekLines(fields, REFERENCE, t)).toEqual(lines);
		expect(overtimeShort(fields, REFERENCE, t)).toBe(overtime);
	});

	it("given_nothingExtra_when_worded_then_saysSo", () => {
		const managers: WeekFields = {
			...FIVE_DAY_WEEK,
			hoursLimitsApply: false,
			extraHoursPaidAs: "NOTHING",
		};
		expect(overtimeShort(managers, REFERENCE, t)).toBe(
			"Overtime after 8 h 48 min a day or 44 h a week, nothing extra"
		);
	});

	it("given_noRateFromAnOlderApi_when_worded_then_saysNoRate", () => {
		const older: WeekFields = { ...FIVE_DAY_WEEK, overtimePercent: null };
		expect(overtimeShort(older, REFERENCE, t)).toBe(
			"Overtime after 8 h 48 min a day or 44 h a week"
		);
	});

	it("says nothing about overtime without the API's figures", () => {
		expect(overtimeShort(FIVE_DAY_WEEK, undefined, t)).toBe("");
	});
});

describe("suggestedTermsName", () => {
	it.each<[WeekFields, string]>([
		[FIVE_DAY_WEEK, "5-day week, 44 h"],
		[SIX_DAY_SHIFT, "Shift work, 6 days, 12 h"],
		[PART_TIME_20, "Part-time, 20 h"],
		[{ ...FIVE_DAY_WEEK, daysPerWeek: null }, "44 h week"],
	])("names %o", (fields, name) => {
		expect(suggestedTermsName(fields, PART_TIME_BELOW_MINUTES, t)).toBe(name);
	});
});
