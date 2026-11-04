import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import {
	humaniseIdentifier,
	ruleLabel,
} from "@/features/scheduling/roster/findings/ruleLabel";

let t: TFunction;
beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

const rules = new Map([["morning-cover-copy", "Morning cover"]]);

describe("ruleLabel", () => {
	it("given_aListedConstraint_when_labelled_then_isTheConstraintsOwnName", () => {
		expect(
			ruleLabel(
				{
					name: "shift_demand_requirement",
					constraintId: "morning-cover-copy",
				},
				rules,
				t
			)
		).toBe("Morning cover");
	});

	it.each([
		["shift_demand_requirement", "Shift staffing"],
		["shift_demand_with_substitutes", "Shift staffing with stand-ins"],
		["shift_presence_requirement", "Role presence"],
		["off_requirement_per_horizon", "Days off per period"],
		["avoid_off_on_weekdays", "Avoid days off on"],
		["minimum_rest_between_shifts", "Rest between shifts"],
		["timeblock_demand_coverage", "Forecast demand"],
		["a_rule_added_later", "A rule added later"],
	])(
		"given_theEngineRule_%s_withoutAListedConstraint_when_labelled_then_reads_%s",
		(name, label) => {
			expect(ruleLabel({ name, constraintId: "not-listed" }, rules, t)).toBe(
				label
			);
			expect(ruleLabel({ name, constraintId: null }, rules, t)).toBe(label);
		}
	);
});

describe("humaniseIdentifier", () => {
	it.each([
		["SHIFT_TOO_SHORT", "Shift too short"],
		["some-rule_name", "Some rule name"],
		["", ""],
	])("given_%s_when_humanised_then_reads_%s", (identifier, text) => {
		expect(humaniseIdentifier(identifier)).toBe(text);
	});
});
