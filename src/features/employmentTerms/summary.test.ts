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
	restShort,
	suggestedTermsName,
	termsSentence,
	weekShort,
} from "@/features/employmentTerms/summary";

const t = i18n.getFixedT("en");
const es = i18n.getFixedT("es");
const NO_LINE = { ...REFERENCE, partTimeBelowMinutes: null };

describe("termsSentence", () => {
	it.each<[string, WeekFields, string]>([
		[
			"a five-day week with daily overtime",
			FIVE_DAY_WEEK,
			"Works 5 days a week, 8.8 hours a day. Rest day Sunday. Overtime starts after 8.8 hours in a day or 44 hours in a week. Employment Act hour limits apply.",
		],
		[
			"shift work, averaged, rest day on the roster",
			SIX_DAY_SHIFT,
			"Works 6 days a week in shifts of up to 12 hours. The roster sets one rest day each week. Overtime starts after an average of 44 hours a week. Employment Act hour limits apply.",
		],
		[
			"a part-time week below the line",
			PART_TIME_20,
			"Works 20 hours a week. The roster sets one rest day each week. Part-time: below 35 hours a week. Hours past their own hours are extra hours until 44 hours a week, then overtime. Employment Act hour limits apply.",
		],
		[
			"days without a day figure, limits off",
			{ ...STANDARD_WEEK, hoursLimitsApply: false },
			"Works 6 days a week. The roster sets one rest day each week. Overtime starts after 44 hours in a week. Employment Act hour limits don’t apply; hours are still counted.",
		],
		[
			"half days",
			{ ...FIVE_DAY_WEEK, daysPerWeek: 5.5, dayMinutes: 480, restDay: "SAT" },
			"Works 5.5 days a week, 8 hours a day. Rest day Saturday. Overtime starts after 8 hours in a day or 44 hours in a week. Employment Act hour limits apply.",
		],
	])("reads %s", (_, fields, sentence) => {
		expect(termsSentence(fields, REFERENCE, t, "en")).toBe(sentence);
	});

	it("leaves overtime out when the reader can't know the part-time line", () => {
		expect(termsSentence(PART_TIME_20, undefined, t, "en")).toBe(
			"Works 20 hours a week. The roster sets one rest day each week. Employment Act hour limits apply."
		);
	});

	it("never calls a week part-time when the company has no line", () => {
		expect(termsSentence(PART_TIME_20, NO_LINE, t, "en")).toContain(
			"Overtime starts after 4 hours in a day or 20 hours in a week."
		);
	});

	it("is written in Spanish too, with Spanish numbers", () => {
		expect(termsSentence(FIVE_DAY_WEEK, NO_LINE, es, "es")).toBe(
			"Trabaja 5 días a la semana, 8,8 horas al día. Día de descanso: Domingo. Las horas extra empiezan después de 8,8 horas al día o 44 horas a la semana. Se aplican los límites de horas de la Ley de Empleo."
		);
	});
});

describe("weekShort and restShort", () => {
	it.each<[WeekFields, string, string]>([
		[FIVE_DAY_WEEK, "5 days · 8.8 h a day · 44 h", "Rest day Sunday"],
		[SIX_DAY_SHIFT, "6 days · 12 h shifts · 44 h", "Rest day on the roster"],
		[PART_TIME_20, "20 h a week", "Rest day on the roster"],
	])("shortens %o", (fields, week, rest) => {
		expect(weekShort(fields, t, "en")).toBe(week);
		expect(restShort(fields, t)).toBe(rest);
	});
});

describe("suggestedTermsName", () => {
	it.each<[WeekFields, string]>([
		[FIVE_DAY_WEEK, "5-day week, 44 h"],
		[SIX_DAY_SHIFT, "Shift work, 6 days, 12 h"],
		[PART_TIME_20, "Part-time, 20 h"],
		[{ ...FIVE_DAY_WEEK, daysPerWeek: null }, "44 h week"],
	])("names %o", (fields, name) => {
		expect(suggestedTermsName(fields, PART_TIME_BELOW_MINUTES, t, "en")).toBe(
			name
		);
	});
});
