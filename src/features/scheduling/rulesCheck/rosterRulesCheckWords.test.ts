import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ApiProblemError } from "@/common/problem";
import {
	ruleFixture,
	rulesCheckFixture,
	staffingGapFixture,
} from "@/features/scheduling/rulesCheck/fixtures";
import {
	brokenRuleCount,
	brokenRuleLabel,
	ENGINE_RULE_NAMES,
	NAMED_RULES,
	notMetCount,
	notMetItems,
	ruleNameLabel,
	rulesCheckRefusalOf,
	validationMark,
} from "@/features/scheduling/rulesCheck/rosterRulesCheckWords";

let t: TFunction;

beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

const problem = (errorCode: string): ApiProblemError =>
	new ApiProblemError({
		message: errorCode,
		status: 409,
		errorCode,
		fieldErrors: [],
		reason: "http",
	});

describe("brokenRuleLabel", () => {
	it("prefers the company's own constraint name", () => {
		expect(
			brokenRuleLabel(
				{
					rule: "most_minutes_a_day",
					constraintId: "k-1",
					constraintName: "Twelve hours",
				},
				t
			)
		).toBe("Twelve hours");
	});

	it("else labels the engine's rule, else says the app has no name for it yet", () => {
		expect(
			brokenRuleLabel(
				{
					rule: "minimum_rest_between_shifts",
					constraintId: null,
					constraintName: null,
				},
				t
			)
		).toBe("Rest between shifts");
		expect(
			brokenRuleLabel(
				{
					rule: "a_rule_added_later",
					constraintId: null,
					constraintName: null,
				},
				t
			)
		).toBe("A rule the app has no name for yet");
	});

	it("labels the rule the engine names when a hand edit puts someone on a shift they can't work", () => {
		expect(
			brokenRuleLabel(
				{
					rule: "impossible_shift_assignment_is_zero",
					constraintId: null,
					constraintName: null,
				},
				t
			)
		).toBe("A shift this person can't work");
	});

	it("has a label for every rule the engine can report", () => {
		const unlabelled = ENGINE_RULE_NAMES.filter(
			(rule) =>
				!NAMED_RULES.includes(rule) ||
				(ruleNameLabel(rule, t) ?? "").startsWith("scheduling.")
		);

		expect(unlabelled).toEqual([]);
	});

	it("has a label in the translations for every rule it names", () => {
		for (const rule of NAMED_RULES)
			expect(
				brokenRuleLabel({ rule, constraintId: null, constraintName: null }, t)
			).not.toMatch(/scheduling\.|has no name for yet/);
	});

	it.each([
		["most_minutes_a_day", "Most hours a day"],
		["max_work_hours_per_day", "Most hours a day"],
		["MAX_WORK_HOURS_PER_DAY", "Most hours a day"],
		["most_overtime_minutes_a_month", "Most overtime a month"],
		["max_overtime_hours_per_month", "Most overtime a month"],
		["most_call_backs_per_person", "Call-backs on a rest or off day"],
		["max_days_without_day_types", "Limit on days in a row"],
		["consecutive_day_work_patterns", "Shifts not to follow each other"],
		["overtime_past_the_normal_day", "Overtime past the normal day"],
	])("calls %s by the name the settings give it: %s", (rule, label) => {
		expect(ruleNameLabel(rule, t)).toBe(label);
	});
});

describe("ruleNameLabel", () => {
	it("names a rule by the table, and leaves a name it does not know to the caller", () => {
		expect(ruleNameLabel("minimum_rest_between_shifts", t)).toBe(
			"Rest between shifts"
		);
		expect(ruleNameLabel("a_rule_added_later", t)).toBeUndefined();
	});
});

const brokenRule = {
	rule: "most_minutes_a_day",
	constraintId: null,
	constraintName: null,
	violations: null,
};

describe("brokenRuleCount", () => {
	it("counts one per rule named, one when broken with none named, and none unless broken", () => {
		expect(
			brokenRuleCount(
				rulesCheckFixture({
					status: "BROKEN",
					brokenRules: [brokenRule, brokenRule],
				})
			)
		).toBe(2);
		expect(brokenRuleCount(rulesCheckFixture({ status: "BROKEN" }))).toBe(1);
		expect(brokenRuleCount(rulesCheckFixture({ status: "HOLDS" }))).toBe(0);
		expect(brokenRuleCount(rulesCheckFixture({ status: "UNCHECKED" }))).toBe(0);
	});
});

describe("validationMark", () => {
	it("counts broken rules and staffing gaps together", () => {
		expect(
			validationMark(
				rulesCheckFixture({
					status: "BROKEN",
					staffingGaps: [staffingGapFixture()],
				})
			)
		).toEqual({ kind: "problems", count: 2 });
	});

	it("is clean only when every rule holds and staffing was worked out with no gaps", () => {
		expect(validationMark(rulesCheckFixture())).toEqual({ kind: "clean" });
		expect(
			validationMark(rulesCheckFixture({ staffingGaps: null }))
		).toBeUndefined();
		expect(
			validationMark(rulesCheckFixture({ status: "UNCHECKED" }))
		).toBeUndefined();
	});
});

describe("rulesCheckRefusalOf", () => {
	it.each([
		["ROSTER_CHECK_NO_ENGINE_JOB", "expired"],
		["ROSTER_CHECK_JOB_EXPIRED", "expired"],
		["ROSTER_CHECK_ENGINE_NOT_CONFIGURED", "notConnected"],
		["ROSTER_REVISION_CONFLICT", "rosterMoved"],
		["ROSTER_CHECK_ENGINE_TOO_SLOW", "tooSlow"],
		["ROSTER_CHECK_ENGINE_FAILED", "failed"],
	] as const)("reads %s as %s", (code, refusal) => {
		expect(rulesCheckRefusalOf(problem(code))).toBe(refusal);
	});
});

describe("notMetItems", () => {
	/** Days as the page writes them, short for the test. */
	const day = (date: string): string => `day ${date}`;
	const check = rulesCheckFixture({
		notMet: [
			ruleFixture({
				rule: "max_consecutive_work_days",
				constraintName: "Five in a row",
				violations: [
					{
						employeeId: "mp-1",
						date: "2026-10-16",
						messages: ["If possible, not met: five in a row"],
					},
					{
						employeeId: "mp-1",
						date: null,
						messages: ["If possible, not met: a long week"],
					},
					{
						employeeId: null,
						date: "2026-10-17",
						messages: ["If possible, not met: short rest"],
					},
					{
						employeeId: "mp-gone",
						date: null,
						messages: ["If possible, not met: gone"],
					},
					{
						employeeId: null,
						date: null,
						messages: ["If possible, not met: anywhere"],
					},
				],
			}),
			ruleFixture({ rule: "most_days_a_week", violations: null }),
		],
		members: [
			{
				memberProfileId: "mp-1",
				membershipId: "m-1",
				displayName: "Aisha Rahman",
			},
			{ memberProfileId: "mp-gone", membershipId: null, displayName: null },
		],
	});

	it("lists each rule by name, tagged If possible in its own amber tone, with who and which days", () => {
		const [fiveInARow, daysAWeek] = notMetItems(check, t, day);

		expect(fiveInARow?.title).toBe("Five in a row");
		expect(fiveInARow?.tag).toEqual({ label: "If possible", tone: "warning" });
		expect(fiveInARow?.lines).toEqual([
			"Aisha Rahman · day 2026-10-16: “If possible, not met: five in a row”",
			"Aisha Rahman: “If possible, not met: a long week”",
			"day 2026-10-17: “If possible, not met: short rest”",
			"Former member: “If possible, not met: gone”",
			"If possible, not met: anywhere",
		]);
		// A rule that cannot say who is still listed, by its name only.
		expect(daysAWeek?.title).toBe("Most days a week");
		expect(daysAWeek?.lines).toEqual([]);
	});

	it("lists nothing when every rule is met or the check could not say", () => {
		expect(notMetItems(rulesCheckFixture({ notMet: [] }), t, day)).toEqual([]);
		expect(notMetItems(rulesCheckFixture({ notMet: null }), t, day)).toEqual(
			[]
		);
	});

	it("counts one per person and day, and one for a rule that cannot say who", () => {
		expect(notMetCount(check)).toBe(6);
		expect(notMetCount(rulesCheckFixture({ notMet: null }))).toBe(0);
	});
});
