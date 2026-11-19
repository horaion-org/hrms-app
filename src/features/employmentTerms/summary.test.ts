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
	suggestedTermsName,
	weekLines,
} from "@/features/employmentTerms/summary";

const t = i18n.getFixedT("en");

describe("weekLines", () => {
	it.each<[string, WeekFields, Array<string>]>([
		["a five-day week", FIVE_DAY_WEEK, ["44 h over 5 days", "Rest day Sunday"]],
		[
			"six days, the roster's rest day",
			SIX_DAY_SHIFT,
			["44 h over 6 days", "Roster picks the rest day"],
		],
		["part-time, with no rest day", PART_TIME_20, ["20 h a week", "Days vary"]],
	])("words %s for a profile", (_, fields, lines) => {
		expect(weekLines(fields, REFERENCE, t)).toEqual(lines);
	});
});

describe("suggestedTermsName", () => {
	it.each<[WeekFields, string]>([
		[FIVE_DAY_WEEK, "Full-time, 5 days, 44 h"],
		[PART_TIME_20, "Part-time, 20 h"],
		[{ ...FIVE_DAY_WEEK, hoursLimitsApply: false }, "Managers, 5 days, 44 h"],
		[{ ...FIVE_DAY_WEEK, daysPerWeek: null }, "Full-time, 44 h"],
	])("names %o", (fields, name) => {
		expect(suggestedTermsName(fields, PART_TIME_BELOW_MINUTES, t)).toBe(name);
	});
});
