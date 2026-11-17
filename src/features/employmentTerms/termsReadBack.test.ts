import { describe, expect, it } from "vitest";
import i18n from "i18next";
import "@/common/i18n";
import type { WeekFields } from "@/features/employmentTerms/api";
import {
	FIVE_DAY_WEEK,
	PART_TIME_20,
	REFERENCE,
	SIX_DAY_SHIFT,
	STANDARD_WEEK,
} from "@/features/employmentTerms/fixtures";
import { termsSentence } from "@/features/employmentTerms/summary";
import {
	termsFormValuesOf,
	weekFieldsOf,
} from "@/features/employmentTerms/termsForm";
import {
	readBackOf,
	termsEffects,
	termsExample,
} from "@/features/employmentTerms/termsReadBack";

const t = i18n.getFixedT("en");
const es = i18n.getFixedT("es");
const MANAGERS: WeekFields = {
	...FIVE_DAY_WEEK,
	dailyOvertime: false,
	hoursLimitsApply: false,
	extraHoursPaidAs: "NOTHING",
};
const valid = termsFormValuesOf(FIVE_DAY_WEEK);

describe("readBackOf", () => {
	it("reads complete terms back as the one sentence every screen uses", () => {
		expect(readBackOf(valid, REFERENCE, t, "en")).toEqual({
			complete: true,
			text: termsSentence(weekFieldsOf(valid)!, REFERENCE, t),
		});
	});

	it("names what is missing instead of a sentence about a week that isn't there", () => {
		expect(readBackOf({ ...valid, weekHours: "" }, REFERENCE, t, "en")).toEqual(
			{
				complete: false,
				text: "Not finished yet: fill in or check the normal hours a week.",
			}
		);
	});

	it("names every unfinished field, in the form's order", () => {
		expect(
			readBackOf(
				{ ...valid, weekHours: "lots", dayHours: "", restWeekday: "" },
				REFERENCE,
				t,
				"en"
			).text
		).toBe(
			"Not finished yet: fill in or check the normal hours a week, the normal hours a day, and the rest day’s weekday."
		);
	});

	it("calls the day the longest shift for shift work", () => {
		expect(
			readBackOf(
				{ ...termsFormValuesOf(SIX_DAY_SHIFT), dayHours: "8:75" },
				REFERENCE,
				t,
				"en"
			).text
		).toBe("Not finished yet: fill in or check the longest shift.");
	});

	it("refuses a week its days can't hold rather than reading it back", () => {
		expect(
			readBackOf({ ...valid, weekHours: "60" }, REFERENCE, t, "en").complete
		).toBe(false);
	});

	it("is never stopped by the name or the description", () => {
		expect(
			readBackOf({ ...valid, name: "" }, REFERENCE, t, "en").complete
		).toBe(true);
	});

	it("names a day longer than the country's longest normal day", () => {
		expect(
			readBackOf({ ...valid, dayHours: "13" }, REFERENCE, t, "en").text
		).toBe("Not finished yet: fill in or check the normal hours a day.");
	});
});

describe("termsSentence, the design's sentence", () => {
	it.each<[string, WeekFields, string]>([
		[
			"a five-day week with daily overtime",
			FIVE_DAY_WEEK,
			"Full-time, 5 days a week, 44 h (8 h 48 min a day). Rest day: Sunday. Overtime after 44 h in a week or 8 h 48 min in a day, paid at 1.5 times. Rest day work counts at 2 times. Day off work counts as normal hours until the week is passed. The Employment Act’s hour limits apply.",
		],
		[
			"six days with the roster's rest day",
			{ ...STANDARD_WEEK, dayMinutes: 440 },
			"Full-time, 6 days a week, 44 h (7 h 20 min a day). Rest day: a different day each week, picked by the roster. Overtime after 44 h in a week, paid at 1.5 times. Rest day work counts at 2 times. The Employment Act’s hour limits apply.",
		],
		[
			"part-time, days vary",
			PART_TIME_20,
			"Part-time, 20 h a week, days vary. Extra hours are paid at the normal rate up to 44 h a week, then at 1.5 times. The Employment Act’s hour limits apply.",
		],
		[
			"managers paid nothing extra",
			MANAGERS,
			"Full-time, 5 days a week, 44 h (8 h 48 min a day). Rest day: Sunday. Hours past 44 h a week earn nothing extra. The Employment Act’s hour limits do not apply.",
		],
		[
			"a day off at its own rate",
			{ ...FIVE_DAY_WEEK, dailyOvertime: false, dayOffWorkPercent: 175 },
			"Full-time, 5 days a week, 44 h (8 h 48 min a day). Rest day: Sunday. Overtime after 44 h in a week, paid at 1.5 times. Rest day work counts at 2 times. Day off work counts at 1.75 times. The Employment Act’s hour limits apply.",
		],
	])("reads %s", (_, fields, sentence) => {
		expect(termsSentence(fields, REFERENCE, t)).toBe(sentence);
	});

	it("leaves full-time or part-time and overtime out without the API's figures", () => {
		expect(termsSentence(PART_TIME_20, undefined, t)).toBe(
			"20 h a week, days vary. Rest day: a different day each week, picked by the roster. The Employment Act’s hour limits apply."
		);
	});

	it("is written in Spanish too", () => {
		expect(termsSentence(MANAGERS, REFERENCE, es)).toBe(
			"Tiempo completo, 5 días a la semana, 44 h (8 h 48 min al día). Día de descanso: Domingo. Las horas por encima de 44 h a la semana no suman nada adicional. No se aplican los límites de horas de la Ley de Empleo."
		);
	});
});

describe("termsExample", () => {
	it("given_dailyOvertime_when_exampled_then_aLongDaySplits", () => {
		expect(termsExample(FIVE_DAY_WEEK, REFERENCE, t)).toBe(
			"Example: a 9 h 48 min day is 8 h 48 min normal and 1 h overtime at 1.5 times."
		);
	});

	it("given_theRostersRestDay_when_exampled_then_saysSundayIsOnlyAnExample", () => {
		expect(termsExample(STANDARD_WEEK, REFERENCE, t)).toBe(
			"Example: 48 h worked in a week is 44 h normal and 4 h overtime at 1.5 times. *The roster picks the rest day each week; Sunday is only shown as an example."
		);
	});

	it("given_partTime_when_exampled_then_extraHoursAtTheNormalRate", () => {
		expect(termsExample(PART_TIME_20, REFERENCE, t)).toBe(
			"Example: 24 h worked in a week is 20 h contracted and 4 h extra at the normal rate."
		);
	});

	it("given_nothingExtra_when_exampled_then_noRate", () => {
		expect(termsExample(MANAGERS, REFERENCE, t)).toBe(
			"Example: 48 h worked in a week is 44 h normal and 4 h overtime."
		);
	});
});

describe("termsEffects", () => {
	it("given_covered_when_listed_then_hoursLimitsRestAndCost", () => {
		expect(termsEffects(FIVE_DAY_WEEK, REFERENCE, t)).toEqual([
			"Hours: overtime is counted from the day and the week above, in the hours ledger and reports.",
			"Rosters: the engine keeps these people within the Work policy’s hour limits.",
			"Rest day: the roster never puts them on a Sunday unless you call them back.",
			"Cost: when the engine chooses who covers a gap, an overtime hour for these people weighs 1.5 times a normal hour.",
		]);
	});

	it("given_managersPaidNothingExtra_when_listed_then_mayPassTheLimitsAndWeighTheSame", () => {
		expect(termsEffects(MANAGERS, REFERENCE, t)).toEqual([
			"Hours: overtime is counted from the week above, in the hours ledger and reports.",
			"Rosters: the engine may plan these people past the hour limits.",
			"Rest day: the roster never puts them on a Sunday unless you call them back.",
			"Cost: extra hours for these people weigh the same as normal hours when the engine chooses cover.",
		]);
	});

	it("given_partTime_when_listed_then_noRestDaySet", () => {
		expect(termsEffects(PART_TIME_20, REFERENCE, t)[2]).toBe(
			"Rest day: none set; the roster follows their availability."
		);
	});
});
