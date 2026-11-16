import { render } from "@testing-library/react";
import { createInstance, type i18n as I18n } from "i18next";
import { Fragment } from "react";
import { I18nextProvider, Trans } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import type {
	ConstraintField,
	ConstraintRequirement,
	ConstraintType,
} from "@/features/scheduling/constraints/api";
import {
	constraintWords,
	firmnessOf,
	sentencePartsOf,
	type SentenceValue,
} from "@/features/scheduling/constraints/constraintSentence";

let i18n: I18n;

beforeAll(async () => {
	i18n = createInstance();
	await i18n.init({
		lng: "en",
		resources: { en: { translation: en }, es: { translation: es } },
	});
});

const plain = (field: ConstraintField, value: string): SentenceValue => ({
	field,
	value,
	name: null,
});
const named = (field: ConstraintField, name: string): SentenceValue => ({
	field,
	value: name.toLowerCase(),
	name,
});

/** The constraint's sentences as a reader sees them, every tag filled with its words. */
const read = (
	type: ConstraintType,
	values: Array<SentenceValue>,
	language = "en",
	fullTimersOnly = false,
	requirement: ConstraintRequirement | null = null
): string => {
	const t = i18n.getFixedT(language);
	const constraint = { type, values, fullTimersOnly, requirement };
	const words = constraintWords(constraint, t);
	const parts = Object.fromEntries(
		Object.entries(words).map(([field, text]) => [
			field,
			<span key={field}>{text}</span>,
		])
	);
	const { container } = render(
		<I18nextProvider i18n={i18n}>
			{sentencePartsOf(constraint).map((part, index) => (
				<Fragment key={part.i18nKey}>
					{index > 0 && " "}
					<Trans
						components={parts}
						count={part.count}
						i18nKey={part.i18nKey}
						t={t}
					/>
				</Fragment>
			))}
		</I18nextProvider>
	);
	return container.textContent ?? "";
};

const AM = named("SHIFT", "Front desk AM");
const PM = named("SHIFT", "Front desk PM");
const CLERK = named("JOB_TITLE", "Clerk");
const LEAD = named("JOB_TITLE", "Lead");
const shiftRule = (
	comparison: string,
	headcount: string,
	shifts: Array<SentenceValue>,
	jobTitles: Array<SentenceValue>
): Array<SentenceValue> => [
	plain("COMPARISON", comparison),
	plain("HEADCOUNT", headcount),
	...jobTitles,
	...shifts,
];

describe("sentencePartsOf with constraintWords", () => {
	it.each([
		[
			"AT_LEAST",
			"2",
			[AM],
			[CLERK, LEAD],
			"Front desk AM needs at least 2 people as Clerk or Lead.",
		],
		[
			"AT_LEAST",
			"1",
			[AM],
			[CLERK, LEAD],
			"Front desk AM needs at least 1 person as Clerk or Lead.",
		],
		[
			"AT_MOST",
			"3",
			[AM],
			[CLERK, LEAD],
			"Front desk AM has at most 3 people as Clerk or Lead.",
		],
		[
			"EXACTLY",
			"2",
			[AM],
			[CLERK, LEAD],
			"Front desk AM needs exactly 2 people as Clerk or Lead.",
		],
		[
			"AT_MOST",
			"0",
			[AM],
			[CLERK, LEAD],
			"Front desk AM has no one as Clerk or Lead.",
		],
		[
			"EXACTLY",
			"0",
			[AM],
			[CLERK, LEAD],
			"Front desk AM has no one as Clerk or Lead.",
		],
		[
			"AT_LEAST",
			"3",
			[AM, PM],
			[CLERK],
			"Front desk AM and Front desk PM together need at least 3 people as Clerk each day.",
		],
		[
			"AT_MOST",
			"3",
			[AM, PM],
			[CLERK],
			"Front desk AM and Front desk PM together have at most 3 people as Clerk each day.",
		],
		[
			"EXACTLY",
			"3",
			[AM, PM],
			[CLERK],
			"Front desk AM and Front desk PM together need exactly 3 people as Clerk each day.",
		],
		[
			"EXACTLY",
			"0",
			[AM, PM],
			[CLERK],
			"Front desk AM and Front desk PM together have no one as Clerk each day.",
		],
	])(
		"reads staffing %s %s over %#",
		(comparison, headcount, shifts, jobTitles, sentence) => {
			expect(
				read(
					"SHIFT_STAFFING",
					shiftRule(comparison, headcount, shifts, jobTitles)
				)
			).toBe(sentence);
		}
	);

	const CLOSING = named("SHIFT", "Closing");
	const OPENING = named("SHIFT", "Opening");
	const MID = named("SHIFT", "Mid");
	const SUPERVISOR = named("JOB_TITLE", "Supervisor");

	it.each([
		[
			"AT_LEAST",
			"1",
			[CLOSING],
			"Closing has at least 1 person as Supervisor on duty from start to finish.",
		],
		[
			"AT_MOST",
			"2",
			[CLOSING],
			"Closing has at most 2 people as Supervisor on duty at any time.",
		],
		[
			"EXACTLY",
			"1",
			[CLOSING],
			"Closing has exactly 1 person as Supervisor on duty at all times.",
		],
		[
			"AT_MOST",
			"0",
			[CLOSING],
			"Closing has no one as Supervisor on duty at any time.",
		],
		[
			"EXACTLY",
			"0",
			[CLOSING],
			"Closing has no one as Supervisor on duty at any time.",
		],
		[
			"AT_LEAST",
			"1",
			[OPENING, MID],
			"Opening or Mid has at least 1 person as Supervisor on duty from start to finish.",
		],
		[
			"AT_MOST",
			"2",
			[OPENING, MID],
			"Opening and Mid each have at most 2 people as Supervisor on duty at any time.",
		],
		[
			"EXACTLY",
			"1",
			[OPENING, MID],
			"Opening and Mid each have exactly 1 person as Supervisor on duty at all times.",
		],
		[
			"EXACTLY",
			"0",
			[OPENING, MID],
			"Opening and Mid each have no one as Supervisor on duty at any time.",
		],
	])(
		"reads on duty %s %s over %#",
		(comparison, headcount, shifts, sentence) => {
			expect(
				read(
					"ROLE_PRESENCE",
					shiftRule(comparison, headcount, shifts, [SUPERVISOR])
				)
			).toBe(sentence);
		}
	);

	it.each([
		[
			"2",
			[CLOSING],
			"Closing needs at least 2 people as Lead. 2 people as Clerk count as 1 Lead.",
		],
		[
			"1",
			[CLOSING],
			"Closing needs at least 2 people as Lead. 1 person as Clerk counts as 1 Lead.",
		],
		[
			"2",
			[OPENING, CLOSING],
			"Opening and Closing together need at least 2 people as Lead each day. 2 people as Clerk count as 1 Lead.",
		],
	])(
		"reads stand-ins at %s per person over %#",
		(perPerson, shifts, sentence) => {
			expect(
				read("SHIFT_STAFFING_WITH_STAND_INS", [
					plain("HEADCOUNT", "2"),
					plain("STAND_INS_PER_PERSON", perPerson),
					LEAD,
					named("STAND_IN_JOB_TITLE", "Clerk"),
					...shifts,
				])
			).toBe(sentence);
		}
	);

	it.each([
		["AT_LEAST", "1", "1", "At least 1 day off every week."],
		["AT_LEAST", "2", "2", "At least 2 days off every 2 weeks."],
		["AT_MOST", "2", "2", "At most 2 days off every 2 weeks."],
		["EXACTLY", "2", "2", "Exactly 2 days off every 2 weeks."],
		["AT_LEAST", "4", "4", "At least 4 days off every 4 weeks."],
		["AT_MOST", "0", "1", "No days off every week."],
		["EXACTLY", "0", "3", "No days off every 3 weeks."],
	])(
		"reads days off %s %s every %s weeks",
		(comparison, daysOff, weeks, sentence) => {
			expect(
				read("DAYS_OFF_PER_PERIOD", [
					plain("COMPARISON", comparison),
					plain("DAYS_OFF", daysOff),
					plain("PERIOD_WEEKS", weeks),
				])
			).toBe(sentence);
		}
	);

	it.each([
		["OFF", "1", "1", "At least 1 Day off every week."],
		["REST", "2", "2", "At least 2 Rest days every 2 weeks."],
	])(
		"reads a days-off rule counting only %s with the day type in place of days off",
		(dayType, daysOff, weeks, sentence) => {
			expect(
				read("DAYS_OFF_PER_PERIOD", [
					plain("COMPARISON", "AT_LEAST"),
					plain("DAYS_OFF", daysOff),
					plain("PERIOD_WEEKS", weeks),
					plain("DAY_TYPE", dayType),
				])
			).toBe(sentence);
		}
	);

	it("reads a days-off rule in weeks in Spanish", () => {
		expect(
			read(
				"DAYS_OFF_PER_PERIOD",
				[
					plain("COMPARISON", "AT_LEAST"),
					plain("DAYS_OFF", "2"),
					plain("PERIOD_WEEKS", "2"),
					plain("DAY_TYPE", "REST"),
				],
				"es"
			)
		).toBe("Al menos 2 Días de descanso cada 2 semanas.");
	});

	it("reads a days-off rule that kept its period in days as one with a period still to choose, never in days", () => {
		const sentence = read("DAYS_OFF_PER_PERIOD", [
			plain("COMPARISON", "AT_LEAST"),
			plain("DAYS_OFF", "1"),
			plain("PERIOD_DAYS", "6"),
		]);

		expect(sentence).toBe("At least 1 day off in a period still to choose.");
		expect(sentence).not.toMatch(/days in a row|window|rolling/);
	});

	it("reads avoided days off with the weekdays joined by and", () => {
		expect(
			read("AVOID_DAYS_OFF_ON", [
				plain("WEEKDAY", "FRI"),
				plain("WEEKDAY", "SAT"),
			])
		).toBe("Avoid days off on Friday and Saturday.");
	});

	it.each([
		["10", "Everyone gets at least 10 hours off between shifts."],
		["1", "Everyone gets at least 1 hour off between shifts."],
	])("reads rest of %s hours", (hours, sentence) => {
		expect(read("REST_BETWEEN_SHIFTS", [plain("REST_HOURS", hours)])).toBe(
			sentence
		);
	});

	it.each([
		[
			"12",
			"Nobody whose Employment Act limits apply works more than 12 hours in a day, overtime included.",
		],
		[
			"1",
			"Nobody whose Employment Act limits apply works more than 1 hour in a day, overtime included.",
		],
	])("reads most hours a day of %s", (hours, sentence) => {
		expect(
			read("MAX_WORK_HOURS_PER_DAY", [plain("WORK_HOURS_A_DAY", hours)])
		).toBe(sentence);
	});

	it.each([
		[
			"72",
			"Nobody whose Employment Act limits apply works more than 72 hours of overtime in a calendar month.",
		],
		[
			"1",
			"Nobody whose Employment Act limits apply works more than 1 hour of overtime in a calendar month.",
		],
		["0", "Nobody whose Employment Act limits apply works overtime."],
	])("reads most overtime a month of %s", (hours, sentence) => {
		expect(
			read("MAX_OVERTIME_HOURS_PER_MONTH", [
				plain("OVERTIME_HOURS_A_MONTH", hours),
			])
		).toBe(sentence);
	});

	it.each([
		[
			"240",
			"A shift is given around leave on the same day only if at least 240 minutes of it are worked.",
		],
		[
			"1",
			"A shift is given around leave on the same day only if at least 1 minute of it is worked.",
		],
	])(
		"reads the shortest part of a shift of %s minutes",
		(minutes, sentence) => {
			expect(
				read("SHORTEST_PART_SHIFT", [plain("PART_SHIFT_MINUTES", minutes)])
			).toBe(sentence);
		}
	);

	it.each([
		[
			"2",
			"Everyone may be called back to work on a rest or off day at most 2 times in a roster.",
		],
		[
			"1",
			"Everyone may be called back to work on a rest or off day at most 1 time in a roster.",
		],
		["0", "Nobody is called back to work on a rest or off day."],
	])("reads most call-backs of %s", (callBacks, sentence) => {
		expect(
			read("MAX_CALL_BACKS_PER_PERSON", [plain("CALL_BACKS", callBacks)])
		).toBe(sentence);
	});

	it.each([
		[
			"1",
			"When a role is missing for some hours of a shift, someone on the shift just before or after it may stay on or start early by up to 1 hour. Used only when you ask the engine in Find cover, never when a roster is generated.",
		],
		[
			"2",
			"When a role is missing for some hours of a shift, someone on the shift just before or after it may stay on or start early by up to 2 hours. Used only when you ask the engine in Find cover, never when a roster is generated.",
		],
	])("reads an overtime stretch of %s hours", (hours, sentence) => {
		expect(read("OVERTIME_STRETCH", [plain("STRETCH_HOURS", hours)])).toBe(
			sentence
		);
	});

	it("reads the pay rates with a day off counted as ordinary hours when it has no rate of its own", () => {
		expect(
			read("PAY_RATES", [
				plain("OVERTIME_PERCENT", "150"),
				plain("REST_DAY_WORK_PERCENT", "200"),
				plain("TIME_OFF_EARNED_PERCENT", "100"),
			])
		).toBe(
			"An hour of overtime costs 150% of a normal hour, and an hour of work on a rest day 200%. Work on a day off counts as ordinary hours."
		);
	});

	it("reads the pay rates with a day off at its own rate", () => {
		expect(
			read("PAY_RATES", [
				plain("OVERTIME_PERCENT", "150"),
				plain("REST_DAY_WORK_PERCENT", "200"),
				plain("DAY_OFF_WORK_PERCENT", "120"),
			])
		).toBe(
			"An hour of overtime costs 150% of a normal hour, and an hour of work on a rest day 200%. An hour of work on a day off costs 120% of a normal hour."
		);
	});

	it("reads keep days off together as what the roster tries to do", () => {
		expect(read("KEEP_DAYS_OFF_TOGETHER", [])).toBe(
			"Keep each person’s rest days, days off and leave together where the roster allows."
		);
	});

	it.each([
		[
			"en",
			"No days off on Friday and Saturday.",
			"Each person’s rest days, days off and leave in a week are together.",
		],
		[
			"es",
			"Sin días libres el Viernes y Sábado.",
			"Los días de descanso, días libres y permisos de cada persona en una semana van juntos.",
		],
	])(
		"reads the two rules asked as a Must as what never happens (%s)",
		(language, avoid, together) => {
			const weekend = [plain("WEEKDAY", "FRI"), plain("WEEKDAY", "SAT")];

			expect(read("AVOID_DAYS_OFF_ON", weekend, language, false, "MUST")).toBe(
				avoid
			);
			expect(read("KEEP_DAYS_OFF_TOGETHER", [], language, false, "MUST")).toBe(
				together
			);
		}
	);

	it.each([
		["MUST", "Nobody works Night then Morning on consecutive days."],
		[
			"SHOULD",
			"Try not to give anyone Night then Morning on consecutive days.",
		],
	] as const)(
		"reads a banned shift pattern asked as %s day by day",
		(requirement, sentence) => {
			const nightThenMorning = [
				named("PATTERN_DAY_1", "Night"),
				named("PATTERN_DAY_2", "Morning"),
			];

			expect(
				read("BANNED_SHIFT_PATTERN", nightThenMorning, "en", false, requirement)
			).toBe(sentence);
		}
	);

	it("reads the shifts of one day of a banned pattern as alternatives, every filled day, and in Spanish", () => {
		const values = [
			named("PATTERN_DAY_1", "Night"),
			named("PATTERN_DAY_1", "Late"),
			named("PATTERN_DAY_2", "Night"),
			named("PATTERN_DAY_3", "Morning"),
		];

		expect(read("BANNED_SHIFT_PATTERN", values, "en", false, "MUST")).toBe(
			"Nobody works Night or Late then Night then Morning on consecutive days."
		);
		expect(
			read(
				"BANNED_SHIFT_PATTERN",
				[named("PATTERN_DAY_1", "Noche"), named("PATTERN_DAY_2", "Mañana")],
				"es",
				false,
				"MUST"
			)
		).toBe("Nadie trabaja Noche y luego Mañana en días seguidos.");
	});

	it("reads no overtime when generating as what a generated roster does", () => {
		expect(read("NO_OVERTIME_WHEN_GENERATING", [])).toBe(
			"A generated roster gives nobody overtime past their normal day or week and calls nobody back on a rest day. Shifts it can’t staff without extra hours are left short, and overtime is offered when you ask the engine in Find cover."
		);
	});

	it("reads most hours a day in Spanish", () => {
		expect(
			read("MAX_WORK_HOURS_PER_DAY", [plain("WORK_HOURS_A_DAY", "12")], "es")
		).toBe(
			"Nadie a quien se apliquen los límites de horas de la Ley de Empleo trabaja más de 12 horas en un día, horas extra incluidas."
		);
	});

	it("reads a number not filled in yet as plural, and a missing comparison as at least", () => {
		expect(sentencePartsOf({ type: "SHIFT_STAFFING", values: [] })).toEqual([
			{
				i18nKey:
					"scheduling.constraints.sentences.SHIFT_STAFFING.oneShift.AT_LEAST",
				count: 2,
			},
		]);
	});

	it.each([
		[
			true,
			"12",
			"No full-timer goes more than 12 days in a row without a Rest day.",
		],
		[
			true,
			"1",
			"No full-timer goes more than 1 day in a row without a Rest day.",
		],
		[false, "12", "Nobody goes more than 12 days in a row without a Rest day."],
	])(
		"reads the days limit for full-timers only %s, %s days",
		(fullTimersOnly, days, sentence) => {
			expect(
				read(
					"MAX_DAYS_WITHOUT_DAY_TYPES",
					[plain("DAYS_IN_A_ROW", days), plain("DAY_TYPE", "REST")],
					"en",
					fullTimersOnly
				)
			).toBe(sentence);
		}
	);

	it("reads the days limit's day types joined by or, an unknown one made readable", () => {
		expect(
			read("MAX_DAYS_WITHOUT_DAY_TYPES", [
				plain("DAYS_IN_A_ROW", "6"),
				plain("DAY_TYPE", "REST"),
				plain("DAY_TYPE", "PUBLIC_HOLIDAY_OFF"),
			])
		).toBe(
			"Nobody goes more than 6 days in a row without a Rest day or Public holiday off."
		);
	});

	it.each([
		[
			true,
			"AT_LEAST",
			"1",
			"Every full-timer has at least 1 Rest day each week.",
		],
		[
			true,
			"AT_LEAST",
			"2",
			"Every full-timer has at least 2 Rest days each week.",
		],
		[
			true,
			"EXACTLY",
			"2",
			"Every full-timer has exactly 2 Rest days each week.",
		],
		[false, "AT_LEAST", "1", "Everyone has at least 1 Rest day each week."],
		[false, "EXACTLY", "2", "Everyone has exactly 2 Rest days each week."],
	])(
		"reads the weekly rule for full-timers only %s, %s %s",
		(fullTimersOnly, comparison, count, sentence) => {
			expect(
				read(
					"DAY_TYPE_DAYS_PER_WEEK",
					[
						plain("COMPARISON", comparison),
						plain("DAY_TYPE_COUNT", count),
						plain("DAY_TYPE", "REST"),
					],
					"en",
					fullTimersOnly
				)
			).toBe(sentence);
		}
	);

	it("keeps the singular label of a day type with no plural in the weekly rule", () => {
		expect(
			read("DAY_TYPE_DAYS_PER_WEEK", [
				plain("COMPARISON", "AT_LEAST"),
				plain("DAY_TYPE_COUNT", "2"),
				plain("DAY_TYPE", "LEAVE"),
			])
		).toBe("Everyone has at least 2 Leave each week.");
	});

	it("reads the weekly rule in Spanish with the plural label", () => {
		expect(
			read(
				"DAY_TYPE_DAYS_PER_WEEK",
				[
					plain("COMPARISON", "AT_LEAST"),
					plain("DAY_TYPE_COUNT", "2"),
					plain("DAY_TYPE", "REST"),
				],
				"es",
				true
			)
		).toBe(
			"Cada empleado a tiempo completo tiene al menos 2 Días de descanso cada semana."
		);
	});

	it("joins job titles with o in Spanish", () => {
		expect(
			read(
				"SHIFT_STAFFING",
				shiftRule("AT_LEAST", "2", [AM], [CLERK, LEAD]),
				"es"
			)
		).toBe("Front desk AM necesita al menos 2 personas como Clerk o Lead.");
	});
});

describe("firmnessOf", () => {
	it.each([
		["ALWAYS_SHOULD", null, "SHOULD"],
		["ALWAYS_MUST", null, "MUST"],
		["MUST_OR_SHOULD", "SHOULD", "SHOULD"],
		["MUST_OR_SHOULD", "MUST", "MUST"],
		["MUST_OR_SHOULD", null, null],
		["SETTING", null, null],
		["UNKNOWN", null, null],
		[undefined, "SHOULD", "SHOULD"],
		[undefined, null, null],
	] as const)(
		"reads a %s type with %s as %s",
		(requirementPolicy, requirement, firmness) => {
			expect(firmnessOf({ requirement, requirementPolicy })).toBe(firmness);
		}
	);
});
