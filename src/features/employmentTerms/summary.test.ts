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
	STANDARD_WEEK,
} from "@/features/employmentTerms/fixtures";
import {
	overtimeShort,
	suggestedTermsName,
	termsSentence,
	weekLines,
} from "@/features/employmentTerms/summary";

const t = i18n.getFixedT("en");
const es = i18n.getFixedT("es");
const NO_LINE = { ...REFERENCE, partTimeBelowMinutes: null };

describe("termsSentence", () => {
	it.each<[string, WeekFields, string]>([
		[
			"a five-day week with daily overtime",
			FIVE_DAY_WEEK,
			"Works 44 hours over 5 days a week, 8 hours 48 minutes a day. Sunday is the rest day, every week. Overtime starts after 8 hours 48 minutes in a day or 44 hours in a week. Overtime is paid at 1.5 times. Rest day work counts at 2 times. Employment Act hour limits apply: rosters keep them within the work-hour limits.",
		],
		[
			"shift work, counted by the week, rest day on the roster",
			SIX_DAY_SHIFT,
			"Works 44 hours a week over 6 days, in shifts of up to 12 hours. The roster picks one rest day each week. Shift work: overtime counts by the week, after 44 hours. Overtime is paid at 1.5 times. Rest day work counts at 2 times. Employment Act hour limits apply: rosters keep them within the work-hour limits.",
		],
		[
			"a part-time week below the line, with no rest day",
			PART_TIME_20,
			"Works 20 hours a week; the days vary. Rosters don’t set a rest day for part-timers. Part-time (under 35 hours a week): hours past their own hours are extra hours until 44 hours a week, then overtime. Overtime is paid at 1.5 times. Employment Act hour limits apply: rosters keep them within the work-hour limits.",
		],
		[
			"days without a day figure, limits off",
			{ ...STANDARD_WEEK, hoursLimitsApply: false },
			"Works 44 hours over 6 days a week. The roster picks one rest day each week. Overtime starts after 44 hours in a week. Overtime is paid at 1.5 times. Rest day work counts at 2 times. Employment Act hour limits don’t apply: rosters may plan them past the work-hour limits, and their hours are still counted.",
		],
		[
			"half days",
			{ ...FIVE_DAY_WEEK, daysPerWeek: 5.5, dayMinutes: 480, restDay: "SAT" },
			"Works 44 hours over 5½ days a week, 8 hours a day. Saturday is the rest day, every week. Overtime starts after 8 hours in a day or 44 hours in a week. Overtime is paid at 1.5 times. Rest day work counts at 2 times. Employment Act hour limits apply: rosters keep them within the work-hour limits.",
		],
	])("reads %s", (_, fields, sentence) => {
		expect(termsSentence(fields, REFERENCE, t)).toBe(sentence);
	});

	it("never says shift work is averaged", () => {
		expect(termsSentence(SIX_DAY_SHIFT, REFERENCE, t)).not.toMatch(/average/i);
	});

	it("leaves overtime out when the reader can't know the part-time line", () => {
		expect(termsSentence(PART_TIME_20, undefined, t)).toBe(
			"Works 20 hours a week; the days vary. The roster picks one rest day each week. Overtime is paid at 1.5 times. Rest day work counts at 2 times. Employment Act hour limits apply: rosters keep them within the work-hour limits."
		);
	});

	it("never calls a week part-time when the company has no line", () => {
		expect(termsSentence(PART_TIME_20, NO_LINE, t)).toContain(
			"Overtime starts after 4 hours in a day or 20 hours in a week."
		);
	});

	it("is written in Spanish too", () => {
		expect(termsSentence(FIVE_DAY_WEEK, NO_LINE, es)).toBe(
			"Trabaja 44 horas en 5 días a la semana, 8 horas 48 minutos al día. El Domingo es el día de descanso, todas las semanas. Las horas extra empiezan después de 8 horas 48 minutos al día o 44 horas a la semana. Las horas extra se pagan a 1.5 veces. El trabajo en el día de descanso cuenta a 2 veces. Se aplican los límites de horas de la Ley de Empleo: los cuadrantes los mantienen dentro de los límites de horas de trabajo."
		);
	});
});

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

	it("given_rate150_when_worded_then_says1Point5Times", () => {
		expect(termsSentence(FIVE_DAY_WEEK, REFERENCE, t)).toContain(
			"Overtime is paid at 1.5 times."
		);
	});

	it("given_nothingExtra_when_worded_then_saysSo", () => {
		const managers: WeekFields = {
			...FIVE_DAY_WEEK,
			hoursLimitsApply: false,
			extraHoursPaidAs: "NOTHING",
		};
		expect(termsSentence(managers, REFERENCE, t)).toContain(
			"Hours past 44 hours a week earn nothing extra."
		);
		expect(overtimeShort(managers, REFERENCE, t)).toBe(
			"Overtime after 8 h 48 min a day or 44 h a week, nothing extra"
		);
	});

	it("given_anOwnDayOffRate_when_worded_then_saysIt", () => {
		expect(
			termsSentence({ ...FIVE_DAY_WEEK, dayOffWorkPercent: 175 }, REFERENCE, t)
		).toContain("Day off work counts at 1.75 times.");
	});

	it("given_noRateFromAnOlderApi_when_worded_then_saysNoRate", () => {
		const older: WeekFields = { ...FIVE_DAY_WEEK, overtimePercent: null };
		expect(termsSentence(older, REFERENCE, t)).not.toContain("paid at");
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
