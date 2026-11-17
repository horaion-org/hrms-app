import { createInstance } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import english from "@/assets/locales/en/translations.json";
import spanish from "@/assets/locales/es/translations.json";
import {
	CONSTRAINT_REQUIREMENTS,
	CONSTRAINT_TYPES,
	PATTERN_DAYS,
	type ConstraintType,
	type ConstraintTypeOption,
	type DepartmentConstraint,
} from "@/features/scheduling/constraints/api";
import { sentencePartsOf } from "@/features/scheduling/constraints/constraintSentence";
import {
	CONSTRAINT_TYPE_CATALOGUE,
	fieldReadingOrderOf,
	isCountedOnShifts,
	isRetiredConstraintType,
	startsIfPossible,
} from "@/features/scheduling/constraints/constraintTypeCatalogue";
import {
	BANNED_PATTERN_FIXTURE,
	BRANCH_POLICY_FIXTURE,
	COMPANY_CONSTRAINT_FIXTURES,
	CONSTRAINT_FIXTURES,
	CONSTRAINT_TYPE_OPTIONS,
	DAYS_LIMIT_FIXTURE,
	DEPARTMENTS_POLICY_FIXTURE,
	MOST_HOURS_A_DAY_FIXTURE,
	MOST_OVERTIME_A_MONTH_FIXTURE,
	PAY_RATES_FIXTURE,
	WEEKLY_RULE_FIXTURE,
} from "@/features/scheduling/constraints/fixtures";
import { ENGINE_RULE_NAMES } from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";

/** A name no record holds, as a newer API might send. */
const UNKNOWN_TYPE = "SOMETHING_NEW" as ConstraintType;

describe("the catalogue's lookups", () => {
	it("names the three retired types and no other", () => {
		expect(CONSTRAINT_TYPES.filter(isRetiredConstraintType)).toEqual([
			"ROLE_PRESENCE",
			"SHORTEST_PART_SHIFT",
			"PAY_RATES",
		]);
	});

	it("counts the shift staffing types, the retired one included, on their shifts", () => {
		expect(CONSTRAINT_TYPES.filter(isCountedOnShifts)).toEqual([
			"SHIFT_STAFFING",
			"SHIFT_STAFFING_WITH_STAND_INS",
			"ROLE_PRESENCE",
		]);
	});

	it("starts the two kinds that were only ever If possible as If possible", () => {
		expect(CONSTRAINT_TYPES.filter(startsIfPossible)).toEqual([
			"AVOID_DAYS_OFF_ON",
			"KEEP_DAYS_OFF_TOGETHER",
		]);
	});

	it.each<[ConstraintType, ReadonlyArray<string>]>([
		["SHIFT_STAFFING", ["SHIFT", "COMPARISON", "HEADCOUNT", "JOB_TITLE"]],
		["BANNED_SHIFT_PATTERN", PATTERN_DAYS],
		["KEEP_DAYS_OFF_TOGETHER", []],
	])("reads the fields of %s in its sentence's order", (type, order) => {
		expect(fieldReadingOrderOf(type)).toEqual(order);
	});

	it("knows nothing of a type it has no record for", () => {
		expect(isRetiredConstraintType(UNKNOWN_TYPE)).toBe(false);
		expect(isCountedOnShifts(UNKNOWN_TYPE)).toBe(false);
		expect(startsIfPossible(UNKNOWN_TYPE)).toBe(false);
		expect(fieldReadingOrderOf(UNKNOWN_TYPE)).toEqual([]);
	});
});

/*
 * The completeness test: every constraint type has each thing a type needs,
 * wherever it lives (its catalogue record, its copy, its sentence, its
 * fixtures). A failure names the type and what it lacks.
 */

/** Each thing every constraint type must have. */
const CATALOGUE_FACTS = [
	"label",
	"offeredTypeLook",
	"sentenceCopy",
	"fixtureOption",
	"fixtureConstraint",
	"fieldReadingOrder",
	"engineRuleNames",
] as const;

type CatalogueFact = (typeof CATALOGUE_FACTS)[number];

/** A fact a type lacks today, and why. */
type KnownGap = { type: ConstraintType; fact: CatalogueFact; reason: string };

/**
 * Gaps in today's code, each expected to fail until it is filled; delete its
 * line then. Any gap not listed here fails the test.
 */
const KNOWN_GAPS: ReadonlyArray<KnownGap> = [
	...(
		[
			"ROLE_PRESENCE",
			"SHORTEST_PART_SHIFT",
			"MAX_CALL_BACKS_PER_PERSON",
			"NO_OVERTIME_WHEN_GENERATING",
			"OVERTIME_STRETCH",
			"KEEP_DAYS_OFF_TOGETHER",
		] as const
	).map((type) => ({
		type,
		fact: "fixtureConstraint" as const,
		reason: "the fixtures hold no constraint of this type yet",
	})),
	{
		type: "MAX_WORK_HOURS_PER_DAY",
		fact: "engineRuleNames",
		reason:
			"max_work_hours_per_day was a proposed engine name; the engine sends most_minutes_a_day",
	},
	{
		type: "MAX_OVERTIME_HOURS_PER_MONTH",
		fact: "engineRuleNames",
		reason:
			"max_overtime_hours_per_month was a proposed engine name; the engine sends most_overtime_minutes_a_month",
	},
	{
		type: "SHORTEST_PART_SHIFT",
		fact: "engineRuleNames",
		reason:
			"shortest_part_shift is a retired rule's name the engine no longer registers",
	},
];

/** The scheduling copy every locale holds, with no fallback, so a key missing from one locale reads as missing. */
const copy = createInstance();

beforeAll(async () => {
	await copy.init({
		lng: "en",
		fallbackLng: false,
		resources: {
			en: { translation: english },
			es: { translation: spanish },
		},
	});
});

const LOCALES = ["en", "es"] as const;

/** Each of `keys` some locale lacks, as "<locale> <key>"; `count` picks the plural form. */
const missingCopy = (
	keys: ReadonlyArray<string>,
	count?: number
): Array<string> =>
	LOCALES.flatMap((locale) =>
		keys
			.filter((key) => !copy.exists(key, { lng: locale, count }))
			.map((key) => `${locale} ${key}`)
	);

describe("missingCopy", () => {
	it("names a key no locale holds, and finds a plural key by its count", () => {
		expect(missingCopy(["scheduling.constraints.types.SOMETHING_NEW"])).toEqual(
			[
				"en scheduling.constraints.types.SOMETHING_NEW",
				"es scheduling.constraints.types.SOMETHING_NEW",
			]
		);
		expect(
			missingCopy(["scheduling.constraints.sentences.REST_BETWEEN_SHIFTS"], 2)
		).toEqual([]);
	});
});

/** Every constraint the fixtures export, wherever it is declared. */
const EVERY_FIXTURE_CONSTRAINT: ReadonlyArray<DepartmentConstraint> = [
	...CONSTRAINT_FIXTURES,
	...COMPANY_CONSTRAINT_FIXTURES,
	WEEKLY_RULE_FIXTURE,
	MOST_HOURS_A_DAY_FIXTURE,
	MOST_OVERTIME_A_MONTH_FIXTURE,
	PAY_RATES_FIXTURE,
	DAYS_LIMIT_FIXTURE,
	BANNED_PATTERN_FIXTURE,
	DEPARTMENTS_POLICY_FIXTURE,
	BRANCH_POLICY_FIXTURE,
];

/** The fixture constraints of a type. */
const fixtureConstraintsOf = (
	type: ConstraintType
): Array<DepartmentConstraint> =>
	EVERY_FIXTURE_CONSTRAINT.filter((constraint) => constraint.type === type);

/** The fixture option that declares a type, if any. */
const fixtureOptionOf = (
	type: ConstraintType
): ConstraintTypeOption | undefined =>
	CONSTRAINT_TYPE_OPTIONS.find((option) => option.type === type);

/** Whether the type is offered, which only a retired type is not. */
const isOffered = (type: ConstraintType): boolean =>
	!isRetiredConstraintType(type);

/**
 * Every way a type's sentence is read: with its fixtures' values and with
 * none filled in yet, as a Must and as If possible, for everyone and for
 * full-timers only.
 */
const sentenceSourcesOf = (
	type: ConstraintType
): Array<Parameters<typeof sentencePartsOf>[0]> =>
	[[], ...fixtureConstraintsOf(type).map(({ values }) => values)].flatMap(
		(values) =>
			CONSTRAINT_REQUIREMENTS.flatMap((requirement) =>
				[false, true].map((fullTimersOnly) => ({
					type,
					values,
					requirement,
					fullTimersOnly,
				}))
			)
	);

/** What each fact finds missing for a type, one line per missing thing; none when it is complete. */
const MISSING: Record<CatalogueFact, (type: ConstraintType) => Array<string>> =
	{
		label: (type) => missingCopy([`scheduling.constraints.types.${type}`]),
		offeredTypeLook: (type) => {
			if (!isOffered(type)) return [];
			const icon = CONSTRAINT_TYPE_CATALOGUE[type].icon ? [] : ["icon"];
			return [
				...icon,
				...missingCopy([
					`scheduling.constraints.descriptions.${type}`,
					`scheduling.constraints.examples.${type}`,
					`scheduling.constraints.nameSuggestions.${type}`,
				]),
			];
		},
		sentenceCopy: (type) => [
			...new Set(
				sentenceSourcesOf(type).flatMap((source) =>
					sentencePartsOf(source).flatMap(({ i18nKey, count }) =>
						missingCopy([i18nKey], count)
					)
				)
			),
		],
		fixtureOption: (type) =>
			isOffered(type) && !fixtureOptionOf(type)
				? ["an option in CONSTRAINT_TYPE_OPTIONS"]
				: [],
		fixtureConstraint: (type) =>
			fixtureConstraintsOf(type).length === 0
				? ["a constraint in constraints/fixtures.ts"]
				: [],
		fieldReadingOrder: (type) => {
			const option = fixtureOptionOf(type);
			if (!option) return [];
			return fieldReadingOrderOf(type)
				.filter((field) => !option.fields.some((spec) => spec.field === field))
				.map((field) => `${field} in its option's fields`);
		},
		engineRuleNames: (type) =>
			CONSTRAINT_TYPE_CATALOGUE[type].engineRuleNames
				.filter((rule) => !ENGINE_RULE_NAMES.includes(rule))
				.map((rule) => `${rule} in ENGINE_RULE_NAMES`),
	};

/** The listed gap of a type's fact, if it is one. */
const knownGapOf = (
	type: ConstraintType,
	fact: CatalogueFact
): KnownGap | undefined =>
	KNOWN_GAPS.find((gap) => gap.type === type && gap.fact === fact);

describe.each(CONSTRAINT_TYPES)("constraint type %s", (type) => {
	for (const fact of CATALOGUE_FACTS) {
		const gap = knownGapOf(type, fact);
		const test = gap ? it.fails : it;
		test(
			gap ? `has its ${fact} (known gap: ${gap.reason})` : `has its ${fact}`,
			() => {
				const missing = MISSING[fact](type);
				expect(missing, `${type} lacks ${missing.join(", ")}`).toEqual([]);
			}
		);
	}
});
