import { createInstance, type TFunction } from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "@/assets/locales/en/translations.json";
import type { NotAssignedReason } from "@/features/scheduling/cover/engineRepairApi";
import { NOT_ASSIGNED_FIXTURE } from "@/features/scheduling/cover/engineRepairFixtures";
import {
	couldTakeTheShift,
	notAssignedInOrder,
	notAssignedReasonLine,
	whyNotWithoutCards,
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
		["role_not_on_shift", "Does not hold this shift’s job title."],
		[
			"fixed_day_no_call_back",
			"Has a fixed day off that day and may not be called back.",
		],
		["on_leave", "On leave that day."],
		["outside_availability", "Not available for these hours."],
		[
			"works_another_shift",
			"On another shift that day, which would be left short.",
		],
		["breaks_unnamed_rule", "Would break a working-time rule."],
		["not_checked", "Not checked in time."],
		["no_shift_part_time", "Part-time, with no shift that day."],
		["too_little_shift_left", "Cannot take this shift."],
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
		).toBe("Would break: Most hours a day");
		expect(
			notAssignedReasonLine(reason("breaks_rule", { rule: "a_new_rule" }), t)
		).toBe("Would break a working-time rule.");
		expect(notAssignedReasonLine(reason("breaks_rule"), t)).toBe(
			"Would break a working-time rule."
		);
	});
});

describe("needs_overtime", () => {
	it("words someone who could take the shift only with extra hours", () => {
		expect(notAssignedReasonLine(reason("needs_overtime"), t)).toBe(
			"Could take it with extra hours."
		);
	});

	it("counts them as able to take the shift, listed first, not as a refusal", () => {
		const overtimeOnly = {
			memberProfileId: "m-9",
			name: "Gina Tan",
			couldTake: false,
			reasons: [reason("needs_overtime")],
		};
		const refused = {
			memberProfileId: "m-8",
			name: "Hari Lim",
			couldTake: false,
			reasons: [reason("on_leave")],
		};

		expect(couldTakeTheShift(overtimeOnly)).toBe(true);
		expect(couldTakeTheShift(refused)).toBe(false);
		expect(
			notAssignedInOrder([refused, overtimeOnly]).map((person) => person.name)
		).toEqual(["Gina Tan", "Hari Lim"]);
	});
});

describe("notAssignedInOrder", () => {
	it("puts people who could take the shift first, keeping the engine's order within each group", () => {
		expect(
			notAssignedInOrder(NOT_ASSIGNED_FIXTURE).map((person) => person.name)
		).toEqual(["Farid Aziz", "Dana Lim", "Ella Tan"]);
	});
});

describe("whyNotWithoutCards", () => {
	it("leaves out everyone an option already changes, keeping the engine's order", () => {
		expect(
			whyNotWithoutCards(NOT_ASSIGNED_FIXTURE, new Set(["m-5"])).map(
				(person) => person.name
			)
		).toEqual(["Dana Lim", "Farid Aziz"]);
	});
});
