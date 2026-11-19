import { describe, expect, it } from "vitest";
import i18n from "i18next";
import "@/common/i18n";
import {
	FIVE_DAY_WEEK,
	PART_TIME_20,
	PART_TIME_BELOW_MINUTES,
	STANDARD_WEEK,
} from "@/features/employmentTerms/fixtures";
import {
	durationLong,
	durationShort,
	formatDays,
	hoursInput,
	parseHours,
} from "@/features/employmentTerms/hours";
import {
	BLANK_TERMS,
	dayLineOf,
	parseDays,
	termsBodyOf,
	termsFormSchema,
	termsFormValuesOf,
	typedWeekOf,
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
		["8.3333", { kind: "minutes", minutes: 500 }],
		["8:48", { kind: "minutes", minutes: 528 }],
		["8h48", { kind: "minutes", minutes: 528 }],
		["8 h 48 min", { kind: "minutes", minutes: 528 }],
		["8h", { kind: "minutes", minutes: 480 }],
		["8:60", { kind: "invalid" }],
	])("reads %j", (text, parsed) => {
		expect(parseHours(text)).toEqual(parsed);
	});

	it("shows minutes in a field as hours, or hours and minutes, never decimals", () => {
		expect(hoursInput(2640)).toBe("44");
		expect(hoursInput(528)).toBe("8:48");
		expect(hoursInput(500)).toBe("8:20");
		expect(hoursInput(null)).toBe("");
		// What the field shows reads back as the same minutes.
		expect(parseHours(hoursInput(500))).toEqual({
			kind: "minutes",
			minutes: 500,
		});
	});

	it("words a duration in hours and minutes, in English and Spanish", () => {
		expect(durationLong(528, t)).toBe("8 hours 48 minutes");
		expect(durationLong(60, t)).toBe("1 hour");
		expect(durationLong(30, t)).toBe("30 minutes");
		expect(durationShort(528, t)).toBe("8 h 48 min");
		expect(durationShort(2640, t)).toBe("44 h");
		expect(durationLong(528, i18n.getFixedT("es"))).toBe("8 horas 48 minutos");
	});

	it("writes half days with ½", () => {
		expect(formatDays(5)).toBe("5");
		expect(formatDays(5.5)).toBe("5½");
		expect(formatDays(0.5)).toBe("½");
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
		expect(problemsOf(termsFormValuesOf(STANDARD_WEEK))).toEqual({});
		expect(problemsOf(termsFormValuesOf(PART_TIME_20))).toEqual({});
	});

	it.each<[string, Partial<TermsFormValues>, Record<string, string>]>([
		["an empty name", { name: " " }, { name: "Enter a name." }],
		["a week not typed", { weekHours: "" }, { weekHours: "Enter the hours." }],
		[
			"hours that aren't whole minutes",
			{ weekHours: "44.33" },
			{ weekHours: "Use whole minutes, such as 8:30 or 8:45." },
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

	it("given_60hOver4Days_when_checked_then_dayAbove12hRefusedWithWhatToDo", () => {
		const result = termsFormSchema(t, { maxDayMinutes: 720 }).safeParse({
			...valid,
			daysPerWeek: "4",
			weekHours: "60",
		});
		expect(result.success ? [] : result.error.issues).toEqual([
			expect.objectContaining({
				path: ["weekHours"],
				message:
					"60 h over 4 days is 15 h a day, more than the longest normal day of 12 h. Lower the hours a week or add working days.",
			}),
		]);
	});
});

describe("the pay", () => {
	/** The problems with the country's minimum overtime rate for covered staff known, as the dialog checks them. */
	const payProblemsOf = (values: TermsFormValues): Record<string, string> => {
		const result = termsFormSchema(t, {
			minimumCoveredOvertimePercent: 150,
		}).safeParse(values);
		if (result.success) return {};
		return Object.fromEntries(
			result.error.issues.map((issue) => [String(issue.path[0]), issue.message])
		);
	};

	it("given_covered_and1Point2_when_checked_then_saysEnter1Point5OrMore", () => {
		expect(payProblemsOf({ ...valid, overtimeTimes: "1.2" })).toEqual({
			overtimeTimes:
				"Staff covered by the Employment Act’s hour rules are paid at least 1.5 times for overtime. Enter 1.5 or more, or say these terms are not under the Act’s hour rules if they are for managers or executives.",
		});
	});

	it("given_notCovered_and1_when_checked_then_ok", () => {
		expect(
			payProblemsOf({ ...valid, hoursLimitsApply: false, overtimeTimes: "1" })
		).toEqual({});
	});

	it("given_covered_andNothingExtra_when_checked_then_refused", () => {
		expect(
			payProblemsOf({ ...valid, extraHoursPaidAs: "NOTHING" })
		).toHaveProperty("extraHoursPaidAs");
	});

	it("given_notCovered_andNothingExtra_when_checked_then_theHiddenRateIsNotAsked", () => {
		expect(
			payProblemsOf({
				...valid,
				hoursLimitsApply: false,
				extraHoursPaidAs: "NOTHING",
				overtimeTimes: "",
			})
		).toEqual({});
	});

	it("given_ownDayOffRate_withoutAFigure_when_checked_then_asksForIt", () => {
		expect(
			payProblemsOf({ ...valid, dayOffMode: "OWN_RATE", dayOffTimes: "" })
		).toEqual({
			dayOffTimes: "Enter the rate as a number of times a normal hour.",
		});
	});

	it("given_aRateAbove10Times_when_checked_then_saysTheRange", () => {
		expect(payProblemsOf({ ...valid, restDayTimes: "10.01" })).toEqual({
			restDayTimes: "Enter a rate from 0 to 10 times a normal hour.",
		});
	});
});

describe("weekFieldsOf and termsBodyOf", () => {
	it("round-trips terms through the form", () => {
		expect(termsBodyOf(termsFormValuesOf(FIVE_DAY_WEEK))).toEqual({
			name: FIVE_DAY_WEEK.name,
			description: FIVE_DAY_WEEK.description,
			daysPerWeek: 5,
			weekMinutes: 2640,
			restDay: "SUN",
			dailyOvertime: true,
			hoursLimitsApply: true,
			overtimePercent: 150,
			restDayWorkPercent: 200,
			dayOffWorkPercent: null,
			extraHoursPaidAs: "RATE",
		});
	});

	it("given_anOwnDayOffRate_when_sent_then_itsPercentage", () => {
		expect(
			weekFieldsOf({ ...valid, dayOffMode: "OWN_RATE", dayOffTimes: "1.75" })
		).toMatchObject({ dayOffWorkPercent: 175 });
	});

	it("given_44hOver5Days_when_read_then_theDayIsWorkedOut", () => {
		expect(weekFieldsOf(valid)).toMatchObject({ dayMinutes: 528 });
	});

	it("given_daysVary_when_read_then_noDayAndNoDailyOvertime", () => {
		expect(
			weekFieldsOf({ ...valid, daysPerWeek: "", dailyOvertime: true })
		).toMatchObject({ dayMinutes: null, dailyOvertime: false });
	});

	it("has no week while the form is blank", () => {
		expect(weekFieldsOf(BLANK_TERMS)).toBeUndefined();
	});
});

describe("typedWeekOf", () => {
	it("given_fiveDaysOf44Hours_when_read_then_aFullTimeWeekOf8Hours48", () => {
		expect(
			typedWeekOf({ daysPerWeek: "5", weekHours: "44" }, PART_TIME_BELOW_MINUTES)
		).toEqual({ days: 5, weekMinutes: 2640, dayMinutes: 528, partTime: false });
	});

	it("given_20HoursOnVaryingDays_when_read_then_partTimeWithNoNormalDay", () => {
		expect(
			typedWeekOf({ daysPerWeek: "", weekHours: "20" }, PART_TIME_BELOW_MINUTES)
		).toEqual({ days: null, weekMinutes: 1200, dayMinutes: null, partTime: true });
	});

	it("given_unreadableHours_when_read_then_noWeekAndNotPartTime", () => {
		expect(
			typedWeekOf({ daysPerWeek: "5", weekHours: "lots" }, PART_TIME_BELOW_MINUTES)
		).toEqual({ days: 5, weekMinutes: null, dayMinutes: null, partTime: false });
	});
});

describe("dayLineOf", () => {
	/** The line for a week typed as days and hours. */
	const lineFor = (daysPerWeek: string, weekHours: string): string | undefined =>
		dayLineOf(typedWeekOf({ daysPerWeek, weekHours }, PART_TIME_BELOW_MINUTES), t);

	it("given_wholeDays_when_read_then_saysTheDay", () => {
		expect(lineFor("5", "44")).toBe("That is 8 h 48 min a day.");
	});

	it("given_aHalfDay_when_read_then_saysTheDayAndTheHalfDay", () => {
		expect(lineFor("5.5", "44")).toBe(
			"That is 8 h a day, with a half day of 4 h."
		);
	});

	it("given_varyingDays_when_read_then_saysHoursVary", () => {
		expect(lineFor("", "20")).toBe("Hours a day vary with the roster.");
	});

	it("given_noHours_when_read_then_saysNothing", () => {
		expect(lineFor("5", "")).toBeUndefined();
	});
});
