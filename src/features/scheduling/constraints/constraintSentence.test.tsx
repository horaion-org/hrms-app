import { render } from "@testing-library/react";
import { createInstance, type i18n as I18n } from "i18next";
import { Fragment } from "react";
import { I18nextProvider, Trans } from "react-i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import es from "@/assets/locales/es/translations.json";
import type {
	ConstraintField,
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
	language = "en"
): string => {
	const t = i18n.getFixedT(language);
	const constraint = { type, values };
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
		[
			"AT_LEAST",
			"2",
			"Everyone gets at least 2 days off in any 7 days in a row.",
		],
		[
			"AT_LEAST",
			"1",
			"Everyone gets at least 1 day off in any 7 days in a row.",
		],
		[
			"AT_MOST",
			"3",
			"Everyone gets at most 3 days off in any 7 days in a row.",
		],
		[
			"EXACTLY",
			"2",
			"Everyone gets exactly 2 days off in any 7 days in a row.",
		],
		["AT_MOST", "0", "Everyone gets no days off in any 7 days in a row."],
		["EXACTLY", "0", "Everyone gets no days off in any 7 days in a row."],
	])("reads days off %s %s", (comparison, daysOff, sentence) => {
		expect(
			read("DAYS_OFF_PER_PERIOD", [
				plain("COMPARISON", comparison),
				plain("DAYS_OFF", daysOff),
				plain("PERIOD_DAYS", "7"),
			])
		).toBe(sentence);
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

	it("reads a number not filled in yet as plural, and a missing comparison as at least", () => {
		expect(sentencePartsOf({ type: "SHIFT_STAFFING", values: [] })).toEqual([
			{
				i18nKey:
					"scheduling.constraints.sentences.SHIFT_STAFFING.oneShift.AT_LEAST",
				count: 2,
			},
		]);
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
		["AVOID_DAYS_OFF_ON", null, "SHOULD"],
		["REST_BETWEEN_SHIFTS", null, "MUST"],
		["SHIFT_STAFFING", "SHOULD", "SHOULD"],
		["DAYS_OFF_PER_PERIOD", "MUST", "MUST"],
		["SHIFT_STAFFING", null, null],
	] as const)("reads %s with %s as %s", (type, requirement, firmness) => {
		expect(firmnessOf({ type, requirement })).toBe(firmness);
	});
});
