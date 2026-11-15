import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ApiProblemError } from "@/common/problem";
import {
	brokenRuleLabel,
	NAMED_RULES,
	ruleNameLabel,
	rulesCheckRefusalOf,
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

	it("else labels the engine's rule, else says a working-time rule", () => {
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
		).toBe("A working-time rule");
	});

	it("has a label in the translations for every rule it names", () => {
		for (const rule of NAMED_RULES)
			expect(
				brokenRuleLabel({ rule, constraintId: null, constraintName: null }, t)
			).not.toMatch(/scheduling\.|A working-time rule/);
	});

	it.each([
		["most_minutes_a_day", "Most hours a day"],
		["max_work_hours_per_day", "Most hours a day"],
		["MAX_WORK_HOURS_PER_DAY", "Most hours a day"],
		["most_overtime_minutes_a_month", "Most overtime a month"],
		["max_overtime_hours_per_month", "Most overtime a month"],
		["most_call_backs_per_person", "Call-backs on a rest or off day"],
		["max_days_without_day_types", "Limit on days in a row"],
		["overtime_past_the_normal_day", "Overtime past the normal day"],
	])("calls %s by the name the settings give it: %s", (rule, label) => {
		expect(ruleNameLabel(rule, t)).toBe(label);
	});
});

describe("rulesCheckRefusalOf", () => {
	it.each([
		["ROSTER_CHECK_NO_ENGINE_JOB", "expired"],
		["ROSTER_CHECK_JOB_EXPIRED", "expired"],
		["ROSTER_CHECK_ENGINE_NOT_CONFIGURED", "notConnected"],
		["ROSTER_REVISION_CONFLICT", "rosterMoved"],
		["ROSTER_CHECK_ENGINE_FAILED", "failed"],
	] as const)("reads %s as %s", (code, refusal) => {
		expect(rulesCheckRefusalOf(problem(code))).toBe(refusal);
	});
});
