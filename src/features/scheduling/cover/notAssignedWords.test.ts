import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { NotAssignedReason } from "@/features/scheduling/cover/engineRepairApi";
import { NOT_ASSIGNED_FIXTURE } from "@/features/scheduling/cover/engineRepairFixtures";
import {
	notAssignedInOrder,
	notAssignedReasonLine,
} from "@/features/scheduling/cover/notAssignedWords";

let t: TFunction;

beforeAll(async () => {
	const i18n = createInstance();
	await i18n.init({ lng: "en", resources: { en: { translation: en } } });
	t = i18n.t;
});

/** A reason with only its code and, for a broken rule, what names the rule. */
const reason = (
	code: string,
	named: Partial<NotAssignedReason> = {}
): NotAssignedReason => ({
	code,
	rule: null,
	constraintId: null,
	constraintName: null,
	...named,
});

describe("notAssignedReasonLine", () => {
	it.each([
		[
			"fixed_day_no_call_back",
			"Has a fixed rest or off day that day, and may not be called back.",
		],
		["on_leave", "On leave that day."],
		["outside_availability", "Not available for this shift’s hours."],
		[
			"too_little_shift_left",
			"Leave that day leaves too little of the shift to work.",
		],
		["works_another_shift", "Already on another shift that day."],
		["breaks_unnamed_rule", "Would break a working-time rule."],
		["not_checked", "Not checked in time."],
		["on_training", "Cannot take this shift."],
	])("words %s", (code, line) => {
		expect(notAssignedReasonLine(reason(code), t)).toBe(line);
	});

	it("names a broken rule by the company's constraint, else the app's rule label, else a working-time rule", () => {
		expect(
			notAssignedReasonLine(
				reason("breaks_rule", {
					rule: "minimum_rest_between_shifts",
					constraintId: "c-rest",
					constraintName: "Rest between shifts",
				}),
				t
			)
		).toBe("Would break: Rest between shifts");
		expect(
			notAssignedReasonLine(
				reason("breaks_rule", { rule: "most_minutes_a_day" }),
				t
			)
		).toBe(
			`Would break: ${t("scheduling.rulesCheck.rule.most_minutes_a_day")}`
		);
		expect(
			notAssignedReasonLine(reason("breaks_rule", { rule: "a_new_rule" }), t)
		).toBe("Would break: a working-time rule");
		expect(notAssignedReasonLine(reason("breaks_rule"), t)).toBe(
			"Would break: a working-time rule"
		);
	});
});

describe("notAssignedInOrder", () => {
	it("puts people who could take the shift first, keeping the engine's order within each group", () => {
		expect(
			notAssignedInOrder(NOT_ASSIGNED_FIXTURE).map((person) => person.name)
		).toEqual(["Farid Aziz", "Dana Lim", "Ella Tan"]);
	});
});
