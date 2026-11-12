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
		["shift_demand_requirement", "People on a shift"],
		["shift_demand_with_substitutes", "People on a shift, with stand-ins"],
		["shift_presence_requirement", "Someone on duty for the whole shift"],
		["off_requirement_per_horizon", "Days off in a run of days"],
		["avoid_off_on_weekdays", "Days to avoid giving off"],
		["minimum_rest_between_shifts", "Rest between shifts"],
		["max_days_without_day_types", "Limit on days in a row"],
		["days_of_day_types_per_period", "Required days each week"],
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
