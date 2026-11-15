import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import { ApiProblemError } from "@/common/problem";
import {
	brokenRuleLabel,
	LABELLED_RULES,
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
		for (const rule of LABELLED_RULES)
			expect(
				brokenRuleLabel({ rule, constraintId: null, constraintName: null }, t)
			).not.toContain("scheduling.rulesCheck");
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
