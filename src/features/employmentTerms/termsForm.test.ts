import { describe, expect, it } from "vitest";
import i18n from "i18next";
import "@/common/i18n";
import {
	FIVE_DAY_WEEK,
	PART_TIME_20,
	SIX_DAY_SHIFT,
} from "@/features/employmentTerms/fixtures";
import { formatHours, parseHours } from "@/features/employmentTerms/hours";
import {
	BLANK_TERMS,
	parseDays,
	termsBodyOf,
	termsFormSchema,
	termsFormValuesOf,
	weekFieldsOf,
	type TermsFormValues,
} from "@/features/employmentTerms/termsForm";

const t = i18n.getFixedT("en");

const problemsOf = (values: TermsFormValues): Record<string, string> => {
	const result = termsFormSchema(t).safeParse(values);
	if (result.success) return {};
	// A field shows its first problem, as the form's resolver does.
	return Object.fromEntries(
		result.error.issues
			.slice()
			.reverse()
			.map((issue) => [String(issue.path[0]), issue.message])
	);
};

const valid: TermsFormValues = termsFormValuesOf(FIVE_DAY_WEEK);

describe("parseHours", () => {
	it.each([
		["44", { kind: "minutes", minutes: 2640 }],
		["8.8", { kind: "minutes", minutes: 528 }],
		["7,5", { kind: "minutes", minutes: 450 }],
		["", { kind: "empty" }],
		["eight", { kind: "invalid" }],
		["-4", { kind: "invalid" }],
		["8.33", { kind: "notWholeMinutes" }],
		// A stored 500 minutes shows as 8.3333 and reads back as itself.
		["8.3333", { kind: "minutes", minutes: 500 }],
	])("reads %j", (text, parsed) => {
		expect(parseHours(text)).toEqual(parsed);
	});

	it("formats minutes back as hours", () => {
		expect(formatHours(528, "en")).toBe("8.8");
		expect(formatHours(2640, "es")).toBe("44");
	});
});

describe("parseDays", () => {
	it.each([
		["5", 5],
		["5.5", 5.5],
		["", null],
		["5.25", "invalid"],
		["8", "invalid"],
		["0", "invalid"],
	])("reads %j", (text, days) => {
		expect(parseDays(text)).toBe(days);
	});
});

describe("termsFormSchema", () => {
	it("accepts terms that mirror the API's rules", () => {
		expect(problemsOf(valid)).toEqual({});
		expect(problemsOf(termsFormValuesOf(SIX_DAY_SHIFT))).toEqual({});
		expect(problemsOf(termsFormValuesOf(PART_TIME_20))).toEqual({});
	});

	it.each<[string, Partial<TermsFormValues>, Record<string, string>]>([
		["an empty name", { name: " " }, { name: "Enter a name." }],
		["a week not typed", { weekHours: "" }, { weekHours: "Enter the hours." }],
		[
			"hours that aren't whole minutes",
			{ dayHours: "8.33" },
			{ dayHours: "Use hours that make whole minutes, such as 8.5 or 8.75." },
		],
		[
			"a week longer than its days",
			{ weekHours: "48" },
			{
				weekHours: "The week is longer than its working days × the normal day.",
			},
		],
		[
			"daily overtime without a day",
			{ dayHours: "" },
			{ dayHours: "Enter the hours." },
		],
		[
			"a fixed rest day without a weekday",
			{ restWeekday: "" },
			{ restWeekday: "Choose the rest day." },
		],
		[
			"days out of range",
			{ daysPerWeek: "9" },
			{ daysPerWeek: "Enter 0.5 to 7 days, in half days." },
		],
	])("refuses %s", (_, change, problems) => {
		expect(problemsOf({ ...valid, ...change })).toEqual(problems);
	});

	it("needs no day when overtime counts by the week only", () => {
		expect(
			problemsOf({ ...valid, dailyOvertime: false, dayHours: "" })
		).toEqual({});
	});
});

describe("weekFieldsOf and termsBodyOf", () => {
	it("round-trips terms through the form", () => {
		expect(termsBodyOf(termsFormValuesOf(FIVE_DAY_WEEK))).toEqual({
			name: FIVE_DAY_WEEK.name,
			description: FIVE_DAY_WEEK.description,
			daysPerWeek: 5,
			weekMinutes: 2640,
			dayMinutes: 528,
			restDay: "SUN",
			dailyOvertime: true,
			shiftWork: false,
			hoursLimitsApply: true,
		});
	});

	it("drops daily overtime for shift work", () => {
		expect(
			weekFieldsOf({ ...valid, shiftWork: true, dailyOvertime: true })
		).toMatchObject({ shiftWork: true, dailyOvertime: false });
	});

	it("has no week while the form is blank", () => {
		expect(weekFieldsOf(BLANK_TERMS)).toBeUndefined();
	});
});
